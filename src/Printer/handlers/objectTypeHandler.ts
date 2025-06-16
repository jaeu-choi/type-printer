// src/handlers/objectTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext, ObjectMember } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 객체 타입 핸들러
 *
 * TypeScript의 객체 타입들을 처리합니다:
 * - 객체 리터럴: { name: string; age: number }
 * - 인터페이스 구조: interface User { name: string }
 * - 타입 별칭 객체: type Person = { name: string }
 * - 제네릭 객체: { key: K; value: V }
 * - 선택적/readonly 프로퍼티: { name?: string; readonly id: number }
 * - 메서드 시그니처: { method(): void }
 */
export class ObjectTypeHandler extends BaseTypeHandler {
  readonly name = "ObjectTypeHandler";
  readonly priority = HandlerPriority.LOW; // 낮은 우선순위 (70) - Array 다음

  /**
   * 객체 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isObjectType(type) || this.isObjectTypeNode(node);
  }

  /**
   * 객체 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for object type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createObjectNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create object type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 객체 타입 노드 생성
   */
  private createObjectNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 ObjectTypeHandler: Processing object type`);

    // 1. 객체 멤버들 추출
    const objectMembers = this.extractObjectMembers(type, node, context);

    // 2. 최종 타입 문자열 생성
    const finalTypeString = this.generateObjectTypeString(objectMembers);

    // 3. 메타데이터 생성
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      finalTypeString,
      debug: {
        warnings: [],
      },
      objectInfo: {
        memberCount: objectMembers.length,
        hasOptionalMembers: objectMembers.some((m) => m.optional),
        hasReadonlyMembers: objectMembers.some((m) => m.readonly),
        hasMethodMembers: objectMembers.some((m) => this.isMethodMember(m)),
      },
    });

    console.log(`🔍 Object processed: ${objectMembers.length} members`);

    // 4. 객체 TypeNode 생성
    return typeNodeFactory.createObject(objectMembers, metadata);
  }

  /**
   * 객체 멤버들 추출
   */
  private extractObjectMembers(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): ObjectMember[] {
    // 방법 1: AST 노드에서 추출 (더 정확함)
    if (node && this.isObjectTypeNode(node)) {
      return this.extractMembersFromNode(node, context);
    }

    // 방법 2: TypeChecker에서 추출
    return this.extractMembersFromType(type, context);
  }

  /**
   * AST 노드에서 멤버들 추출
   */
  private extractMembersFromNode(
    node: ts.TypeNode,
    context: TypeCreationContext
  ): ObjectMember[] {
    const members: ObjectMember[] = [];

    if (ts.isTypeLiteralNode(node)) {
      for (const member of node.members) {
        const extracted = this.extractSingleMember(member, context);
        if (extracted) {
          members.push(extracted);
        }
      }
    }

    return members;
  }

  /**
   * TypeChecker에서 멤버들 추출
   */
  private extractMembersFromType(
    type: ts.Type,
    context: TypeCreationContext
  ): ObjectMember[] {
    const members: ObjectMember[] = [];

    try {
      const properties = type.getProperties();

      for (const prop of properties) {
        const member = this.extractMemberFromSymbol(prop, type, context);
        if (member) {
          members.push(member);
        }
      }

      // 인덱스 시그니처도 처리
      const stringIndexType = type.getStringIndexType();
      if (stringIndexType) {
        const indexMember = this.createIndexSignatureMember(
          stringIndexType,
          "string",
          context
        );
        if (indexMember) members.push(indexMember);
      }

      const numberIndexType = type.getNumberIndexType();
      if (numberIndexType) {
        const indexMember = this.createIndexSignatureMember(
          numberIndexType,
          "number",
          context
        );
        if (indexMember) members.push(indexMember);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to extract object members: ${error}`);
    }

    return members;
  }

  /**
   * 단일 멤버 추출 (AST 기반)
   */
  private extractSingleMember(
    member: ts.TypeElement,
    context: TypeCreationContext
  ): ObjectMember | null {
    // 프로퍼티 시그니처
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const key = this.extractMemberKey(member.name);
      const optional = !!member.questionToken;
      const readonly = this.hasReadonlyModifier(member);

      const memberType = context.checker.getTypeFromTypeNode(member.type);
      const memberTypeNode = globalHandlerRegistry.createTypeNode(
        memberType,
        member.type,
        context
      );

      return {
        key,
        node: memberTypeNode,
        optional,
        readonly,
      };
    }

    // 메서드 시그니처
    if (ts.isMethodSignature(member) && member.name) {
      const key = this.extractMemberKey(member.name);
      const methodType = context.checker.getTypeAtLocation(member);
      const methodTypeNode = globalHandlerRegistry.createTypeNode(
        methodType,
        undefined,
        context
      );

      return {
        key,
        node: methodTypeNode,
        optional: !!member.questionToken,
        readonly: false,
      };
    }

    // 다른 멤버 타입들 (get/set accessor 등)은 일단 스킵
    return null;
  }

  /**
   * 심볼에서 멤버 추출 (TypeChecker 기반)
   */
  private extractMemberFromSymbol(
    symbol: ts.Symbol,
    parentType: ts.Type,
    context: TypeCreationContext
  ): ObjectMember | null {
    try {
      const key = symbol.name;
      const memberType = context.checker.getTypeOfSymbolAtLocation(
        symbol,
        symbol.valueDeclaration || symbol.declarations?.[0]!
      );

      const memberTypeNode = globalHandlerRegistry.createTypeNode(
        memberType,
        undefined,
        context
      );

      // 선택적 프로퍼티 확인
      const optional = !!(symbol.flags & ts.SymbolFlags.Optional);

      // readonly 확인
      let readonly = false;
      if (
        symbol.valueDeclaration &&
        ts.isPropertySignature(symbol.valueDeclaration)
      ) {
        readonly = this.hasReadonlyModifier(symbol.valueDeclaration);
      }

      return {
        key,
        node: memberTypeNode,
        optional,
        readonly,
      };
    } catch (error) {
      console.warn(`⚠️ Failed to extract member "${symbol.name}": ${error}`);
      return null;
    }
  }

  /**
   * 인덱스 시그니처 멤버 생성
   */
  private createIndexSignatureMember(
    indexType: ts.Type,
    keyType: "string" | "number",
    context: TypeCreationContext
  ): ObjectMember | null {
    const indexTypeNode = globalHandlerRegistry.createTypeNode(
      indexType,
      undefined,
      context
    );

    return {
      key: `[key: ${keyType}]`,
      node: indexTypeNode,
      optional: false,
      readonly: false,
    };
  }

  // ==============================
  // 🔧 타입 판별 및 추출 헬퍼들
  // ==============================

  /**
   * TypeScript 타입이 객체 타입인지 확인 (개선된 버전)
   */
  protected isObjectType(type: ts.Type): boolean {
    // 이미 BaseTypeHandler에 있지만 더 정확하게 개선

    // 1. 기본 객체 타입 플래그 확인
    if (!(type.flags & ts.TypeFlags.Object)) {
      return false;
    }

    // 2. Array나 Function 등은 제외
    if (this.isArrayType(type) || this.isFunctionType(type)) {
      return false;
    }

    // 3. 내장 객체들 제외 (Date, RegExp 등)
    if (this.isBuiltinObjectType(type)) {
      return false;
    }

    // 4. 프로퍼티가 있는 객체 타입
    const properties = type.getProperties();
    if (properties && properties.length > 0) {
      return true;
    }

    // 5. 인덱스 시그니처가 있는 객체
    if (type.getStringIndexType() || type.getNumberIndexType()) {
      return true;
    }

    return false;
  }

  /**
   * AST 노드가 객체 타입인지 확인
   */
  private isObjectTypeNode(node?: ts.TypeNode): boolean {
    if (!node) return false;

    // TypeLiteral: { name: string; age: number }
    if (ts.isTypeLiteralNode(node)) {
      return true;
    }

    // MappedType도 객체의 일종이지만 별도 핸들러에서 처리
    // if (ts.isMappedTypeNode(node)) return true;

    return false;
  }

  /**
   * 내장 객체 타입인지 확인
   */
  private isBuiltinObjectType(type: ts.Type): boolean {
    if (!type.symbol) return false;

    const builtinObjects = [
      "Date",
      "RegExp",
      "Error",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
      "Promise",
      "Array",
      "Function",
      "Object",
      "JSON",
      "Math",
      "Number",
      "String",
      "Boolean",
      "Symbol",
      "BigInt",
    ];

    return builtinObjects.includes(type.symbol.name);
  }

  /**
   * 멤버 키 추출
   */
  private extractMemberKey(name: ts.PropertyName): string {
    if (ts.isIdentifier(name)) {
      return name.text;
    }

    if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
      return name.text;
    }

    if (ts.isComputedPropertyName(name)) {
      return `[${name.expression.getText()}]`;
    }

    return "unknown";
  }

  /**
   * readonly 수정자 확인
   */
  private hasReadonlyModifier(member: ts.PropertySignature): boolean {
    return !!member.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
    );
  }

  /**
   * 메서드 멤버인지 확인
   */
  private isMethodMember(member: ObjectMember): boolean {
    return member.node.kind === "function";
  }

  /**
   * 객체 타입 문자열 생성
   */
  private generateObjectTypeString(members: ObjectMember[]): string {
    if (members.length === 0) {
      return "{}";
    }

    const memberStrings = members.map((member) => {
      const optional = member.optional ? "?" : "";
      const readonly = member.readonly ? "readonly " : "";
      const valueType =
        member.node.metadata?.finalTypeString ||
        member.node.literal ||
        member.node.name ||
        "unknown";

      return `${readonly}${member.key}${optional}: ${valueType}`;
    });

    if (memberStrings.length === 1) {
      return `{ ${memberStrings[0]} }`;
    }

    return `{\n  ${memberStrings.join(";\n  ")}\n}`;
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 객체 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "Object literals", // { name: string; age: number }
      "Interface structures", // interface User { name: string }
      "Type alias objects", // type Person = { name: string }
      "Generic objects", // { key: K; value: V }
      "Optional properties", // { name?: string }
      "Readonly properties", // { readonly id: number }
      "Method signatures", // { method(): void }
      "Index signatures", // { [key: string]: any }
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isObject = this.isObjectType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";
    const properties = type.getProperties();
    const stringIndex = type.getStringIndexType();
    const numberIndex = type.getNumberIndexType();

    return [
      `ObjectTypeHandler Debug Info:`,
      `  Is Object: ${isObject}`,
      `  Type String: ${typeString}`,
      `  Property Count: ${properties.length}`,
      `  Type Flags: ${type.flags}`,
      `  Symbol Name: ${type.symbol?.name || "none"}`,
      `  Has String Index: ${!!stringIndex}`,
      `  Has Number Index: ${!!numberIndex}`,
      `  Is Builtin Object: ${this.isBuiltinObjectType(type)}`,
    ].join("\n");
  }

  /**
   * 객체 타입 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedMembers: string[];
  }> {
    return [
      {
        description: "Simple object",
        value: "{ name: string; age: number }",
        expectedMembers: ["name: string", "age: number"],
      },
      {
        description: "Optional properties",
        value: "{ name?: string; email?: string }",
        expectedMembers: ["name?: string", "email?: string"],
      },
      {
        description: "Readonly properties",
        value: "{ readonly id: number; name: string }",
        expectedMembers: ["readonly id: number", "name: string"],
      },
      {
        description: "Mixed properties",
        value: "{ readonly id: number; name?: string; active: boolean }",
        expectedMembers: [
          "readonly id: number",
          "name?: string",
          "active: boolean",
        ],
      },
      {
        description: "Method signature",
        value: "{ getName(): string; setName(name: string): void }",
        expectedMembers: ["getName(): string", "setName(name: string): void"],
      },
      {
        description: "Index signature",
        value: "{ [key: string]: any }",
        expectedMembers: ["[key: string]: any"],
      },
    ];
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 객체 타입 핸들러 인스턴스 생성
 */
export function createObjectTypeHandler(): ObjectTypeHandler {
  return new ObjectTypeHandler();
}

/**
 * 타입이 객체 타입인지 확인하는 헬퍼 함수
 */
export function isObjectType(type: ts.Type, node?: ts.TypeNode): boolean {
  const handler = new ObjectTypeHandler();
  return handler.isApplicable(type, node);
}

/**
 * 지원되는 객체 타입 목록 조회
 */
export function getSupportedObjectTypes(): string[] {
  return ObjectTypeHandler.getSupportedTypes();
}

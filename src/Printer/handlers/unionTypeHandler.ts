// src/handlers/unionTypeHandler.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext, EducationalStep } from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 유니온 타입 핸들러
 *
 * TypeScript의 유니온 타입들을 처리합니다:
 * - 기본 유니온: string | number | boolean
 * - 리터럴 유니온: "red" | "green" | "blue"
 * - 복합 유니온: User | Admin | { type: "guest" }
 * - 중첩 유니온: (string | number) | boolean[]
 * - 제네릭 유니온: T | U | null
 *
 * 🎯 교육적 목적: 각 멤버의 분석 과정을 단계별로 기록
 */
export class UnionTypeHandler extends BaseTypeHandler {
  readonly name = "UnionTypeHandler";
  readonly priority = HandlerPriority.MEDIUM; // 중간 우선순위 (50)

  /**
   * 유니온 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isUnionType(type) || this.isUnionTypeNode(node);
  }

  /**
   * 유니온 타입을 TypeNode로 변환
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for union type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createUnionNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create union type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 유니온 타입 노드 생성 (교육적 과정 포함)
   */
  private createUnionNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 UnionTypeHandler: Processing union type`);

    // 1. 유니온 멤버들 추출
    const unionMembers = this.extractUnionMembers(type, node, context);
    console.log(`🔍 Found ${unionMembers.length} union members`);

    // 2. 🎯 교육적 과정: 각 멤버를 단계별로 분석
    const educationalSteps: EducationalStep[] = [];
    const memberNodes: TypeNode[] = [];

    // Step 1: 유니온 감지
    educationalSteps.push({
      type: "generic-detection", // 범용적인 type 사용
      description: `Union type detected with ${unionMembers.length} members`,
      details: {
        memberCount: unionMembers.length,
        originalText: node?.getText() || type.symbol?.name || "union",
      },
    });

    // Step 2-N: 각 멤버 분석
    unionMembers.forEach((member, index) => {
      console.log(
        `🔍 Analyzing union member ${index + 1}: ${this.getTypeDescription(
          member.type
        )}`
      );

      // 멤버 TypeNode 생성 (재귀적 처리)
      const memberNode = globalHandlerRegistry.createTypeNode(
        member.type,
        member.node,
        context
      );

      memberNodes.push(memberNode);

      // 교육적 단계 기록
      educationalSteps.push({
        type: "definition-lookup", // 적절한 type 사용
        description: `Analyzing member ${index + 1}: ${this.getTypeDescription(
          member.type
        )}`,
        input: member.node?.getText() || this.getTypeDescription(member.type),
        output:
          memberNode.metadata?.finalTypeString ||
          memberNode.literal ||
          "unknown",
        details: {
          memberIndex: index + 1,
          memberKind: memberNode.kind,
          isComplex: this.isComplexType(member.type),
        },
      });
    });

    // Step Final: 유니온 합성
    // 🔍 null 문제 디버깅: 멤버 vs API 결과 비교
    console.log(`🔍 DEBUG null issue:`);
    console.log(`   Members found: ${unionMembers.length}`);
    unionMembers.forEach((member, index) => {
      const desc = this.getTypeDescription(member.type);
      const flags = member.type.flags;
      console.log(`   Member ${index + 1}: "${desc}" (flags: ${flags})`);
    });

    // 🎯 최적의 방법 발견: InTypeAlias 플래그 사용!
    const finalTypeString = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );

    console.log(`🎯 Using InTypeAlias method: "${finalTypeString}"`);

    // 🔍 추가 실험: 다른 플래그 조합들
    const withNullChecks = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias | ts.TypeFormatFlags.NoTruncation
    );
    console.log(`🧪 With NoTruncation: "${withNullChecks}"`);

    // 🔍 컴파일러 설정 확인
    const compilerOptions = context.program.getCompilerOptions();
    console.log(`🔍 strictNullChecks: ${compilerOptions.strictNullChecks}`);
    console.log(`🔍 strict: ${compilerOptions.strict}`);

    educationalSteps.push({
      type: "instantiation-start", // 최종 단계
      description: `Union composition completed: ${finalTypeString}`,
      output: finalTypeString,
      details: {
        totalMembers: memberNodes.length,
        compositionMethod: "typescript-compiler-api",
        apiMethod: "typeToString with InTypeAlias flag",
      },
    });

    // 3. 메타데이터 생성
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      finalTypeString,
      debug: {
        warnings: [],
      },
      educationalSteps, // 🎯 교육적 과정 저장!
      unionInfo: {
        memberCount: memberNodes.length,
        hasLiteralMembers: this.hasLiteralMembers(unionMembers),
        hasComplexMembers: this.hasComplexMembers(unionMembers),
        distributionPotential: this.analyzeDistributionPotential(unionMembers),
      },
    });

    console.log(`🔍 Union analysis completed: ${finalTypeString}`);

    // 4. 유니온 TypeNode 생성
    const unionNode = typeNodeFactory.createUnion(memberNodes, metadata);

    return unionNode;
  }

  /**
   * 유니온 멤버들 추출
   */
  private extractUnionMembers(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): Array<{ type: ts.Type; node?: ts.TypeNode }> {
    // 방법 1: AST 노드에서 추출 (더 정확함)
    if (node && ts.isUnionTypeNode(node)) {
      return this.extractMembersFromNode(node, context);
    }

    // 방법 2: TypeChecker에서 추출
    return this.extractMembersFromType(type, context);
  }

  /**
   * AST 노드에서 멤버들 추출
   */
  private extractMembersFromNode(
    unionNode: ts.UnionTypeNode,
    context: TypeCreationContext
  ): Array<{ type: ts.Type; node: ts.TypeNode }> {
    return unionNode.types.map((typeNode) => ({
      type: context.checker.getTypeFromTypeNode(typeNode),
      node: typeNode,
    }));
  }

  /**
   * TypeChecker에서 멤버들 추출
   */
  private extractMembersFromType(
    unionType: ts.Type,
    context: TypeCreationContext
  ): Array<{ type: ts.Type; node?: ts.TypeNode }> {
    if (unionType.isUnion()) {
      return unionType.types.map((memberType) => ({
        type: memberType,
        // AST 노드는 없음
      }));
    }

    // 유니온이 아닌 경우 자기 자신을 단일 멤버로 처리
    return [{ type: unionType }];
  }

  // ==============================
  // 🔧 타입 판별 및 분석 헬퍼들
  // ==============================

  /**
   * TypeScript 타입이 유니온 타입인지 확인
   */
  protected isUnionType(type: ts.Type): boolean {
    return type.isUnion();
  }

  /**
   * AST 노드가 유니온 타입인지 확인
   */
  private isUnionTypeNode(node?: ts.TypeNode): boolean {
    return node ? ts.isUnionTypeNode(node) : false;
  }

  /**
   * 타입 설명 생성 (교육적 목적)
   */
  private getTypeDescription(type: ts.Type): string {
    const flags = type.flags;

    // 🐛 디버깅: 4번째 멤버 플래그 확인
    if (flags & ts.TypeFlags.Null || flags & ts.TypeFlags.Undefined) {
      console.log(`🐛 DEBUG getTypeDescription for null/undefined:`);
      console.log(`   type.flags: ${flags}`);
      console.log(`   ts.TypeFlags.Null: ${ts.TypeFlags.Null}`);
      console.log(`   ts.TypeFlags.Undefined: ${ts.TypeFlags.Undefined}`);
      console.log(`   hasNullFlag: ${!!(flags & ts.TypeFlags.Null)}`);
      console.log(`   hasUndefinedFlag: ${!!(flags & ts.TypeFlags.Undefined)}`);
    }

    // 간단한 타입 설명 생성
    if (flags & ts.TypeFlags.String) return "string";
    if (flags & ts.TypeFlags.Number) return "number";
    if (flags & ts.TypeFlags.Boolean) return "boolean";
    if (flags & ts.TypeFlags.Null) return "null";
    if (flags & ts.TypeFlags.Undefined) return "undefined";
    if (flags & ts.TypeFlags.Void) return "void";
    if (flags & ts.TypeFlags.Any) return "any";
    if (flags & ts.TypeFlags.Unknown) return "unknown";
    if (flags & ts.TypeFlags.Never) return "never";

    if (flags & ts.TypeFlags.StringLiteral) {
      return `"${(type as ts.StringLiteralType).value}"`;
    }
    if (flags & ts.TypeFlags.NumberLiteral) {
      return `${(type as ts.NumberLiteralType).value}`;
    }
    if (type.symbol?.name) return type.symbol.name;
    return "unknown";
  }

  /**
   * 복합 타입인지 확인
   */
  private isComplexType(type: ts.Type): boolean {
    const flags = type.flags;

    // 🎯 수정: primitive 타입이면 Union 플래그가 있어도 complex 아님!
    const isPrimitive = !!(
      flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Void |
        ts.TypeFlags.Any |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Never)
    );

    // 리터럴 타입도 간단한 타입으로 처리
    const isLiteral = !!(
      flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.EnumLiteral)
    );

    // primitive나 literal이면 complex 아님
    if (isPrimitive || isLiteral) {
      return false;
    }

    // 진짜 복합 타입들만 체크
    const hasObjectFlag = !!(flags & ts.TypeFlags.Object);
    const hasIntersectionFlag = !!(flags & ts.TypeFlags.Intersection);
    const hasCallSignatures = type.getCallSignatures().length > 0;

    // 🎯 Union 플래그는 제외! (유니온 멤버들이 가지고 있어서)
    return hasObjectFlag || hasIntersectionFlag || hasCallSignatures;
  }

  /**
   * 리터럴 멤버가 있는지 확인
   */
  private hasLiteralMembers(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): boolean {
    return members.some(
      (member) =>
        !!(
          member.type.flags &
          (ts.TypeFlags.StringLiteral |
            ts.TypeFlags.NumberLiteral |
            ts.TypeFlags.BooleanLiteral)
        )
    );
  }

  /**
   * 복합 멤버가 있는지 확인
   */
  private hasComplexMembers(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): boolean {
    return members.some((member) => this.isComplexType(member.type));
  }

  /**
   * 분산 가능성 분석 (distributive conditional types 등에서 중요)
   */
  private analyzeDistributionPotential(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): "high" | "medium" | "low" {
    const hasLiterals = this.hasLiteralMembers(members);
    const hasComplex = this.hasComplexMembers(members);

    if (hasLiterals && !hasComplex) return "high"; // "red" | "green" | "blue"
    if (!hasLiterals && !hasComplex) return "medium"; // string | number | boolean
    return "low"; // User | Admin | { type: "guest" }
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 유니온 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "Basic union: string | number | boolean",
      'Literal union: "red" | "green" | "blue"',
      "Mixed union: string | 42 | true",
      "Object union: User | Admin | Guest",
      "Nested union: (string | number) | boolean[]",
      "Generic union: T | U | null",
      "Function union: (() => void) | ((x: string) => number)",
      "Array union: string[] | number[] | boolean[]",
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isUnion = this.isUnionType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";
    const memberCount = type.isUnion() ? type.types.length : 0;

    return [
      `UnionTypeHandler Debug Info:`,
      `  Is Union: ${isUnion}`,
      `  Type String: ${typeString}`,
      `  Member Count: ${memberCount}`,
      `  Type Flags: ${type.flags}`,
      `  Symbol Name: ${type.symbol?.name || "none"}`,
    ].join("\n");
  }

  /**
   * 유니온 타입 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedMembers: string[];
  }> {
    return [
      {
        description: "Basic primitive union",
        value: "string | number | boolean",
        expectedMembers: ["string", "number", "boolean"],
      },
      {
        description: "String literal union",
        value: '"red" | "green" | "blue"',
        expectedMembers: ['"red"', '"green"', '"blue"'],
      },
      {
        description: "Mixed literal union",
        value: "string | 42 | true",
        expectedMembers: ["string", "42", "true"],
      },
      {
        description: "Null/undefined union",
        value: "string | null | undefined",
        expectedMembers: ["string", "null", "undefined"],
      },
      {
        description: "Array union",
        value: "string[] | number[]",
        expectedMembers: ["string[]", "number[]"],
      },
      {
        description: "Object union",
        value: "{ type: 'user' } | { type: 'admin' }",
        expectedMembers: ["{ type: 'user' }", "{ type: 'admin' }"],
      },
    ];
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 유니온 타입 핸들러 인스턴스 생성
 */
export function createUnionTypeHandler(): UnionTypeHandler {
  return new UnionTypeHandler();
}

/**
 * 타입이 유니온 타입인지 확인하는 헬퍼 함수
 */
export function isUnionType(type: ts.Type): boolean {
  return type.isUnion();
}

/**
 * 지원되는 유니온 타입 목록 조회
 */
export function getSupportedUnionTypes(): string[] {
  return UnionTypeHandler.getSupportedTypes();
}

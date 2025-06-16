// src/handlers/intersectionTypeHandler.ts

import * as ts from "typescript";
import {
  TypeNode,
  TypeCreationContext,
  EducationalStep,
  IntermediateStep,
} from "../ir";
import { typeNodeFactory } from "../typeNodeFactory";
import { TypeHandler, HandlerPriority } from "./interface";
import { BaseTypeHandler } from "./helpers";
import { globalHandlerRegistry } from "./registry";

/**
 * 🎯 교집합 타입 핸들러 - 교육적 추론 과정 기록
 *
 * TypeScript의 교집합 타입들을 처리하면서 추론 과정을 상세히 기록:
 * - 기본 교집합: A & B & C
 * - 객체 교집합: { name: string } & { age: number }
 * - 함수 교집합: ((x: string) => void) & ((x: number) => void)
 * - 원시 타입 교집합: string & number (→ never)
 * - 복합 교집합: User & Admin & { lastLogin: Date }
 * - 제네릭 교집합: T & U & { id: string }
 *
 * 🎯 교육적 목표: 교집합 병합 과정의 단계별 이터레이션 기록
 */
export class IntersectionTypeHandler extends BaseTypeHandler {
  readonly name = "IntersectionTypeHandler";
  readonly priority = HandlerPriority.MEDIUM; // 중간 우선순위 (50)

  /**
   * 교집합 타입인지 확인
   */
  isApplicable(type: ts.Type, node?: ts.TypeNode): boolean {
    return this.isIntersectionType(type) || this.isIntersectionTypeNode(node);
  }

  /**
   * 교집합 타입을 TypeNode로 변환 (교육적 과정 포함)
   */
  createTypeNode(
    type: ts.Type,
    node?: ts.TypeNode,
    context?: TypeCreationContext
  ): TypeNode {
    // 안전성 체크
    if (!this.ensureContext(context)) {
      return this.createErrorNode(
        "No context provided for intersection type",
        type,
        node,
        context
      );
    }

    return this.safeCreateTypeNode(
      () => this.createIntersectionNode(type, node, context!),
      () =>
        this.createErrorNode(
          "Failed to create intersection type node",
          type,
          node,
          context
        )
    );
  }

  /**
   * 실제 교집합 타입 노드 생성 (교육적 과정 중심)
   */
  private createIntersectionNode(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): TypeNode {
    console.log(`🔍 IntersectionTypeHandler: Processing intersection type`);

    // 1. 🎯 실제 TypeScript 결과 먼저 확보 (컴파일러 활용)
    const actualFinalResult = context.checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.InTypeAlias
    );

    console.log(`🎯 TypeScript compiler result: "${actualFinalResult}"`);

    // 2. 교집합 멤버들 추출
    const intersectionMembers = this.extractIntersectionMembers(
      type,
      node,
      context
    );
    console.log(`🔍 Found ${intersectionMembers.length} intersection members`);

    // 3. 🎯 교육적 과정: 교집합 병합 이터레이션 기록
    const educationalSteps: EducationalStep[] = [];
    const intermediateSteps: IntermediateStep[] = [];
    const memberNodes: TypeNode[] = [];

    // Step 1: 교집합 감지
    educationalSteps.push({
      type: "generic-detection",
      description: `Intersection type detected with ${intersectionMembers.length} members`,
      details: {
        memberCount: intersectionMembers.length,
        originalText: node?.getText() || type.symbol?.name || "intersection",
        intersectionPattern:
          this.analyzeIntersectionPattern(intersectionMembers),
      },
    });

    // Step 2-N: 각 멤버 분석 + 병합 과정 시뮬레이션
    const mergingProcess = this.simulateMergingProcess(
      intersectionMembers,
      context,
      educationalSteps,
      intermediateSteps
    );

    memberNodes.push(...mergingProcess.memberNodes);

    // Step Final: 교집합 병합 완료
    educationalSteps.push({
      type: "instantiation-start", // 최종 단계
      description: `Intersection merging completed: ${actualFinalResult}`,
      output: actualFinalResult,
      details: {
        totalMembers: memberNodes.length,
        mergingStrategy: mergingProcess.strategy,
        conflicts: mergingProcess.conflicts,
        apiMethod: "typeToString with InTypeAlias flag",
        actualTypeScriptResult: actualFinalResult,
      },
    });

    // 4. 메타데이터 생성 (교육적 정보 풍부하게)
    const metadata = this.createExtendedMetadata(type, node, context, {
      isBuiltin: false,
      analysisMethod: "type-checker",
      finalTypeString: actualFinalResult, // 🎯 실제 컴파일러 결과
      debug: {
        warnings: mergingProcess.warnings,
      },
      educationalSteps, // 🎯 교육적 과정 저장!
      // 🆕 교집합 특화 정보
      intersectionInfo: {
        memberCount: memberNodes.length,
        mergingStrategy: mergingProcess.strategy,
        hasObjectMembers: this.hasObjectMembers(intersectionMembers),
        hasFunctionMembers: this.hasFunctionMembers(intersectionMembers),
        hasPrimitiveMembers: this.hasPrimitiveMembers(intersectionMembers),
        conflictResolution: mergingProcess.conflicts,
        resultComplexity: this.analyzeResultComplexity(actualFinalResult),
      },
    });

    // 5. 중간 단계가 있으면 추가
    if (intermediateSteps.length > 0) {
      metadata.intermediateSteps = intermediateSteps;
    }

    console.log(`🔍 Intersection analysis completed: ${actualFinalResult}`);

    // 6. 교집합 TypeNode 생성
    const intersectionNode = typeNodeFactory.createIntersection(
      memberNodes,
      metadata
    );

    return intersectionNode;
  }

  /**
   * 🎯 교집합 병합 과정 시뮬레이션 (핵심 교육적 기능)
   */
  private simulateMergingProcess(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): {
    memberNodes: TypeNode[];
    strategy: string;
    conflicts: string[];
    warnings: string[];
  } {
    const memberNodes: TypeNode[] = [];
    const conflicts: string[] = [];
    const warnings: string[] = [];
    let strategy = "unknown";

    // 각 멤버 타입 분석
    members.forEach((member, index) => {
      console.log(
        `🔍 Analyzing intersection member ${
          index + 1
        }: ${this.getTypeDescription(member.type)}`
      );

      // 멤버 TypeNode 생성
      const memberNode = globalHandlerRegistry.createTypeNode(
        member.type,
        member.node,
        context
      );
      memberNodes.push(memberNode);

      // 교육적 단계 기록
      educationalSteps.push({
        type: "definition-lookup",
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
          isObjectType: this.isObjectMemberType(member.type),
          isFunctionType: this.isFunctionMemberType(member.type),
          isPrimitiveType: this.isPrimitiveMemberType(member.type),
        },
      });

      // 중간 병합 과정 기록
      if (index > 0) {
        const mergingStep = this.createMergingStep(
          memberNodes.slice(0, index + 1),
          context
        );
        intermediateSteps.push(mergingStep);
      }
    });

    // 병합 전략 결정
    strategy = this.determineMergingStrategy(members);

    // 충돌 감지
    conflicts.push(...this.detectMergingConflicts(members, context));

    // 경고 생성
    if (conflicts.length > 0) {
      warnings.push(`Detected ${conflicts.length} potential merging conflicts`);
    }

    return {
      memberNodes,
      strategy,
      conflicts,
      warnings,
    };
  }

  /**
   * 병합 단계 생성 (중간 과정 기록)
   */
  private createMergingStep(
    cumulativeMembers: TypeNode[],
    context: TypeCreationContext
  ): IntermediateStep {
    const currentResult = this.simulatePartialMerging(cumulativeMembers);

    return {
      stepType: "intersection-merging",
      description: `Merging step: ${cumulativeMembers.length} members`,
      input: cumulativeMembers[cumulativeMembers.length - 2], // 이전 결과
      output: cumulativeMembers[cumulativeMembers.length - 1], // 현재 멤버
      transformation: `Intersection merging: ${currentResult}`,
      metadata: {
        reasoning: `Merged ${cumulativeMembers.length} members: ${currentResult}`,
        condition: `member-count=${cumulativeMembers.length}`,
        operator: "intersection-merge",
      },
    };
  }

  /**
   * 부분 병합 시뮬레이션
   */
  private simulatePartialMerging(members: TypeNode[]): string {
    if (members.length <= 1) {
      return members[0]?.metadata?.finalTypeString || "unknown";
    }

    const typeStrings = members.map(
      (m) => m.metadata?.finalTypeString || m.literal || m.name || "unknown"
    );

    return `(${typeStrings.join(" & ")})`;
  }

  // ==============================
  // 🔧 교집합 멤버 추출
  // ==============================

  /**
   * 교집합 멤버들 추출
   */
  private extractIntersectionMembers(
    type: ts.Type,
    node: ts.TypeNode | undefined,
    context: TypeCreationContext
  ): Array<{ type: ts.Type; node?: ts.TypeNode }> {
    // 방법 1: AST 노드에서 추출 (더 정확함)
    if (node && ts.isIntersectionTypeNode(node)) {
      return this.extractMembersFromNode(node, context);
    }

    // 방법 2: TypeChecker에서 추출
    return this.extractMembersFromType(type, context);
  }

  /**
   * AST 노드에서 멤버들 추출
   */
  private extractMembersFromNode(
    intersectionNode: ts.IntersectionTypeNode,
    context: TypeCreationContext
  ): Array<{ type: ts.Type; node: ts.TypeNode }> {
    return intersectionNode.types.map((typeNode) => ({
      type: context.checker.getTypeFromTypeNode(typeNode),
      node: typeNode,
    }));
  }

  /**
   * 🎯 교집합 병합 과정 시뮬레이션 (핵심 교육적 기능) - 디버깅 강화
   */
  private simulateMergingProcess(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>,
    context: TypeCreationContext,
    educationalSteps: EducationalStep[],
    intermediateSteps: IntermediateStep[]
  ): {
    memberNodes: TypeNode[];
    strategy: string;
    conflicts: string[];
    warnings: string[];
  } {
    const memberNodes: TypeNode[] = [];
    const conflicts: string[] = [];
    const warnings: string[] = [];
    let strategy = "unknown";

    console.log(`🔍 === INTERSECTION MERGING PROCESS START ===`);

    // 각 멤버 타입 분석
    members.forEach((member, index) => {
      console.log(
        `\n🔍 [Member ${index + 1}] Analyzing:`,
        this.getTypeDescription(member.type)
      );
      console.log(`🔍 [Member ${index + 1}] Type flags:`, member.type.flags);
      console.log(
        `🔍 [Member ${index + 1}] Symbol name:`,
        member.type.symbol?.name || "no-symbol"
      );

      // 🎯 핵심: ReferenceTypeHandler 호출 전 상태
      console.log(
        `🎯 [Member ${
          index + 1
        }] Calling globalHandlerRegistry.createTypeNode...`
      );

      // 멤버 TypeNode 생성 - 여기서 다른 핸들러 호출됨
      const memberNode = globalHandlerRegistry.createTypeNode(
        member.type,
        member.node,
        context
      );

      // 🎯 핵심: ReferenceTypeHandler 호출 후 결과
      console.log(`🎯 [Member ${index + 1}] Received TypeNode:`, {
        kind: memberNode.kind,
        name: memberNode.name,
        literal: memberNode.literal,
        finalTypeString: memberNode.metadata?.finalTypeString,
        hasChildren: !!memberNode.children?.length,
        childrenCount: memberNode.children?.length || 0,
      });

      // 자세한 구조 출력
      if (memberNode.children && memberNode.children.length > 0) {
        console.log(`🎯 [Member ${index + 1}] Children structure:`);
        memberNode.children.forEach((child, childIndex) => {
          console.log(
            `    Child ${childIndex}: ${child.kind} - ${
              child.name || child.literal
            }`
          );
        });
      }

      if (memberNode.objectMembers && memberNode.objectMembers.length > 0) {
        console.log(`🎯 [Member ${index + 1}] Object members:`);
        memberNode.objectMembers.forEach((member, memberIndex) => {
          console.log(
            `    ${member.key}: ${
              member.node.metadata?.finalTypeString || member.node.literal
            }`
          );
        });
      }

      memberNodes.push(memberNode);

      // 교육적 단계 기록
      educationalSteps.push({
        type: "definition-lookup",
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
          receivedFromHandler: true,
          handlerResult: {
            kind: memberNode.kind,
            finalTypeString: memberNode.metadata?.finalTypeString,
            hasObjectMembers: !!memberNode.objectMembers?.length,
            hasChildren: !!memberNode.children?.length,
          },
          isObjectType: this.isObjectMemberType(member.type),
          isFunctionType: this.isFunctionMemberType(member.type),
          isPrimitiveType: this.isPrimitiveMemberType(member.type),
        },
      });

      // 중간 병합 과정 기록
      if (index > 0) {
        const mergingStep = this.createMergingStep(
          memberNodes.slice(0, index + 1),
          context
        );
        intermediateSteps.push(mergingStep);

        console.log(`🔄 [Merging Step ${index}] Created intermediate step:`, {
          stepType: mergingStep.stepType,
          description: mergingStep.description,
          transformation: mergingStep.transformation,
        });
      }
    });

    // 🎯 최종 비교 분석
    console.log(`\n🎯 === FINAL ANALYSIS ===`);
    console.log(
      `🎯 TypeScript compiler gave us:`,
      context.checker.typeToString(
        context.checker.getTypeFromTypeNode(
          context.sourceFile.statements[0] as any
        ) // 임시
      )
    );

    console.log(`🎯 We collected ${memberNodes.length} member nodes:`);
    memberNodes.forEach((node, index) => {
      console.log(
        `  ${index + 1}. ${node.kind} - ${
          node.metadata?.finalTypeString || node.literal || node.name
        }`
      );
    });

    // 병합 전략 결정
    strategy = this.determineMergingStrategy(members);
    console.log(`🎯 Determined merging strategy: ${strategy}`);

    // 충돌 감지
    conflicts.push(...this.detectMergingConflicts(members, context));
    console.log(`🎯 Detected conflicts:`, conflicts);

    // 경고 생성
    if (conflicts.length > 0) {
      warnings.push(`Detected ${conflicts.length} potential merging conflicts`);
    }

    console.log(`🔍 === INTERSECTION MERGING PROCESS END ===\n`);

    return {
      memberNodes,
      strategy,
      conflicts,
      warnings,
    };
  }
  /**
   * TypeChecker에서 멤버들 추출
   */
  private extractMembersFromType(
    intersectionType: ts.Type,
    context: TypeCreationContext
  ): Array<{ type: ts.Type; node?: ts.TypeNode }> {
    if (intersectionType.isIntersection()) {
      return intersectionType.types.map((memberType) => ({
        type: memberType,
        // AST 노드는 없음
      }));
    }

    // 교집합이 아닌 경우 자기 자신을 단일 멤버로 처리
    return [{ type: intersectionType }];
  }

  // ==============================
  // 🔧 교집합 분석 헬퍼들
  // ==============================

  /**
   * 교집합 패턴 분석
   */
  private analyzeIntersectionPattern(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): string {
    const hasObjects = this.hasObjectMembers(members);
    const hasFunctions = this.hasFunctionMembers(members);
    const hasPrimitives = this.hasPrimitiveMembers(members);

    if (hasObjects && !hasFunctions && !hasPrimitives) {
      return "object-merging"; // { a: string } & { b: number }
    }

    if (hasFunctions && !hasObjects && !hasPrimitives) {
      return "function-overloading"; // ((x: string) => void) & ((x: number) => void)
    }

    if (hasPrimitives && !hasObjects && !hasFunctions) {
      return "primitive-intersection"; // string & number (→ never)
    }

    if (hasObjects && hasFunctions) {
      return "mixed-object-function"; // object & function
    }

    return "complex-mixed"; // 복합적인 경우
  }

  /**
   * 병합 전략 결정
   */
  private determineMergingStrategy(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): string {
    const pattern = this.analyzeIntersectionPattern(members);

    switch (pattern) {
      case "object-merging":
        return "property-merging";
      case "function-overloading":
        return "signature-overloading";
      case "primitive-intersection":
        return "constraint-checking";
      case "mixed-object-function":
        return "hybrid-merging";
      default:
        return "general-intersection";
    }
  }

  /**
   * 병합 충돌 감지
   */
  private detectMergingConflicts(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>,
    context: TypeCreationContext
  ): string[] {
    const conflicts: string[] = [];

    // 원시 타입 충돌 확인
    const primitiveTypes = members.filter((m) =>
      this.isPrimitiveMemberType(m.type)
    );
    if (primitiveTypes.length > 1) {
      const typeNames = primitiveTypes.map((m) =>
        this.getTypeDescription(m.type)
      );
      conflicts.push(
        `Primitive type conflict: ${typeNames.join(" & ")} → never`
      );
    }

    // 함수 시그니처 충돌 확인 (오버로드 vs 불가능한 결합)
    const functionTypes = members.filter((m) =>
      this.isFunctionMemberType(m.type)
    );
    if (functionTypes.length > 1) {
      conflicts.push(
        `Function signature intersection may create complex overloads`
      );
    }

    return conflicts;
  }

  /**
   * 결과 복잡도 분석
   */
  private analyzeResultComplexity(
    result: string
  ): "simple" | "moderate" | "complex" {
    if (result === "never") return "simple";
    if (result.length < 50) return "simple";
    if (result.length < 200) return "moderate";
    return "complex";
  }

  // ==============================
  // 🔧 타입 판별 헬퍼들
  // ==============================

  /**
   * TypeScript 타입이 교집합 타입인지 확인
   */
  protected isIntersectionType(type: ts.Type): boolean {
    return type.isIntersection();
  }

  /**
   * AST 노드가 교집합 타입인지 확인
   */
  private isIntersectionTypeNode(node?: ts.TypeNode): boolean {
    return node ? ts.isIntersectionTypeNode(node) : false;
  }

  /**
   * 객체 멤버가 있는지 확인
   */
  private hasObjectMembers(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): boolean {
    return members.some((member) => this.isObjectMemberType(member.type));
  }

  /**
   * 함수 멤버가 있는지 확인
   */
  private hasFunctionMembers(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): boolean {
    return members.some((member) => this.isFunctionMemberType(member.type));
  }

  /**
   * 원시 타입 멤버가 있는지 확인
   */
  private hasPrimitiveMembers(
    members: Array<{ type: ts.Type; node?: ts.TypeNode }>
  ): boolean {
    return members.some((member) => this.isPrimitiveMemberType(member.type));
  }

  /**
   * 개별 멤버 타입 판별
   */
  private isObjectMemberType(type: ts.Type): boolean {
    return this.isObjectType(type);
  }

  private isFunctionMemberType(type: ts.Type): boolean {
    return this.isFunctionType(type);
  }

  private isPrimitiveMemberType(type: ts.Type): boolean {
    return this.isBuiltinType(type) || this.isLiteralType(type);
  }

  /**
   * 타입 설명 생성 (교육적 목적)
   */
  private getTypeDescription(type: ts.Type): string {
    const flags = type.flags;

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

    if (this.isFunctionType(type)) return "function";
    if (this.isObjectType(type)) return "object";
    if (type.symbol?.name) return type.symbol.name;

    return "unknown";
  }

  // ==============================
  // 🔧 디버깅 및 검증
  // ==============================

  /**
   * 지원하는 교집합 타입 목록
   */
  static getSupportedTypes(): string[] {
    return [
      "Basic intersection: A & B & C",
      "Object intersection: { name: string } & { age: number }",
      "Function intersection: ((x: string) => void) & ((x: number) => void)",
      "Primitive intersection: string & number (→ never)",
      "Mixed intersection: User & Admin & { lastLogin: Date }",
      "Generic intersection: T & U & { id: string }",
      "Complex intersection: nested and conditional intersections",
    ];
  }

  /**
   * 디버깅용 타입 정보 생성
   */
  getDebugInfo(type: ts.Type, context?: TypeCreationContext): string {
    const isIntersection = this.isIntersectionType(type);
    const typeString = context?.checker?.typeToString(type) || "unknown";
    const memberCount = type.isIntersection() ? type.types.length : 0;

    return [
      `IntersectionTypeHandler Debug Info:`,
      `  Is Intersection: ${isIntersection}`,
      `  Type String: ${typeString}`,
      `  Member Count: ${memberCount}`,
      `  Type Flags: ${type.flags}`,
      `  Symbol Name: ${type.symbol?.name || "none"}`,
      `  Educational Process: enabled`,
      `  Merging Simulation: enabled`,
    ].join("\n");
  }

  /**
   * 교집합 타입 예시 생성 (테스트용)
   */
  static createExamples(): Array<{
    description: string;
    value: string;
    expectedMembers: string[];
    expectedResult: string;
  }> {
    return [
      {
        description: "Basic object intersection",
        value: "{ name: string } & { age: number }",
        expectedMembers: ["{ name: string }", "{ age: number }"],
        expectedResult: "{ name: string; age: number }",
      },
      {
        description: "Primitive intersection (impossible)",
        value: "string & number",
        expectedMembers: ["string", "number"],
        expectedResult: "never",
      },
      {
        description: "Function intersection",
        value: "((x: string) => void) & ((x: number) => void)",
        expectedMembers: ["(x: string) => void", "(x: number) => void"],
        expectedResult: "overloaded function",
      },
      {
        description: "Mixed type intersection",
        value: "User & { readonly id: string } & Timestamped",
        expectedMembers: ["User", "{ readonly id: string }", "Timestamped"],
        expectedResult: "merged object type",
      },
      {
        description: "Generic intersection",
        value: "T & U & { id: string }",
        expectedMembers: ["T", "U", "{ id: string }"],
        expectedResult: "constrained generic type",
      },
    ];
  }
}

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 교집합 타입 핸들러 인스턴스 생성
 */
export function createIntersectionTypeHandler(): IntersectionTypeHandler {
  return new IntersectionTypeHandler();
}

/**
 * 타입이 교집합 타입인지 확인하는 헬퍼 함수
 */
export function isIntersectionType(type: ts.Type): boolean {
  return type.isIntersection();
}

/**
 * 지원되는 교집합 타입 목록 조회
 */
export function getSupportedIntersectionTypes(): string[] {
  return IntersectionTypeHandler.getSupportedTypes();
}

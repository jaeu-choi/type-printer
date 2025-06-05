import * as ts from "typescript";
import { TypeStructure, TypeCollectionContext } from "./types";
import { TypeLookupService } from "./typeLookupService";
export class MappingAnalyzer {
  constructor(
    private readonly checker: ts.TypeChecker,
    private readonly lookupService: TypeLookupService
  ) {}

  /**
   * 🎯 기존의 복잡한 매핑 분석 로직
   * (나중에 TypeChecker 기반으로 대체될 예정)
   */
  collectMappingAnalysisInfo(
    mappedAnalysis: { pattern: string; typeArgs: string[] },
    targetTypeName: string
  ) {
    try {
      // 기존의 복잡한 시뮬레이션 로직을 여기에 이동
      // (현재 printer.ts의 collectMappingAnalysisInfo 내용)

      const mappedDecl = this.lookupService.findTypeDeclaration(
        mappedAnalysis.pattern
      );
      if (!mappedDecl || !ts.isTypeAliasDeclaration(mappedDecl)) {
        console.log(`⚠️ Cannot find mapped pattern: ${mappedAnalysis.pattern}`);
        return null;
      }

      const typeArgDefinitions = mappedAnalysis.typeArgs.map((argName) => {
        const argDecl = this.lookupService.findTypeDeclaration(argName);
        return {
          name: argName,
          definition: argDecl?.getText() || "unknown",
          declaration: argDecl,
        };
      });

      // 🎯 기존의 simulateMappingIterations 로직을 여기서 처리
      const iterations = this.simulateMappingIterations(
        mappedDecl,
        typeArgDefinitions
      );

      return {
        name: mappedAnalysis.pattern,
        pattern: mappedDecl.type.getText(),
        typeParameters:
          mappedDecl.typeParameters?.map((tp) => tp.getText()) || [],
        originalSource: mappedDecl.getText(),
        typeArgs: typeArgDefinitions,
        iterations,
      };
    } catch (error) {
      console.log(`⚠️ Mapping analysis failed: ${error}`);
      return null;
    }
  }

  /**
   * 🎯 기존의 매핑 이터레이션 시뮬레이션 로직
   * (나중에 TypeChecker 기반으로 대체될 예정)
   */
  private simulateMappingIterations(
    mappedDecl: ts.TypeAliasDeclaration,
    typeArgDefinitions: any[]
  ): any[] {
    // 기존 printer.ts의 simulateMappingIterations 로직을 여기로 이동
    // 현재는 간단한 구현으로 대체
    console.log(
      "🔧 Legacy mapping simulation (to be replaced with TypeChecker approach)"
    );
    return [];
  }
}
/**
 * 🎯 TypeChecker 기반 매핑 분석기
 *
 * 기존의 복잡한 시뮬레이션 로직을 제거하고
 * TypeChecker의 결과를 활용한 역공학 방식 사용
 */
export class TypeCheckerBasedMappingAnalyzer {
  constructor(
    private readonly checker: ts.TypeChecker,
    private readonly collector: any // TypeStructureCollector
  ) {}

  /**
   * 🎯 매핑 타입 분석 - TypeChecker 기반
   *
   * 예: Flatten<Nested> 분석
   * 1. TypeChecker로 최종 결과 계산
   * 2. 각 키별로 중간 단계 역공학
   * 3. 과정 재구성
   */
  analyzeMappedType(
    mappedTypeName: string,
    typeArgs: string[],
    context: TypeCollectionContext
  ): MappingAnalysisResult | null {
    try {
      console.log(
        `🔍 Analyzing mapped type: ${mappedTypeName}<${typeArgs.join(", ")}>`
      );

      // 1. 매핑 타입 선언 찾기
      const mappedDeclaration = this.findMappedTypeDeclaration(
        mappedTypeName,
        context
      );
      if (!mappedDeclaration) {
        console.log(
          `⚠️ Cannot find mapped type declaration: ${mappedTypeName}`
        );
        return null;
      }

      // 2. TypeChecker로 최종 결과 계산
      const finalResult = this.calculateFinalResult(
        mappedTypeName,
        typeArgs,
        context
      );
      if (!finalResult) {
        console.log(`⚠️ Cannot calculate final result for: ${mappedTypeName}`);
        return null;
      }

      // 3. 매핑 패턴 분석
      const pattern = this.analyzeMappingPattern(mappedDeclaration);

      // 4. 🎯 핵심: TypeChecker를 이용한 키별 역공학
      const keyAnalysis = this.reverseEngineerKeyMappings(
        pattern,
        typeArgs,
        finalResult,
        context
      );

      // 5. 결과 조합
      return {
        mappedTypeName,
        typeArgs,
        pattern,
        finalResult,
        keyAnalysis,
        iterations: this.createIterationsFromKeyAnalysis(keyAnalysis),
        metadata: {
          analysisMethod: "typeChecker-based",
          totalKeys: keyAnalysis.length,
          hasConditionalLogic: this.hasConditionalLogic(pattern),
          hasKeyRemapping: this.hasKeyRemapping(pattern),
        },
      };
    } catch (error) {
      console.log(`⚠️ Mapping analysis failed: ${error}`);
      return null;
    }
  }

  /**
   * 🎯 TypeChecker로 최종 결과 계산
   */
  private calculateFinalResult(
    mappedTypeName: string,
    typeArgs: string[],
    context: TypeCollectionContext
  ): FinalMappingResult | null {
    try {
      // TypeScript factory를 이용해 제네릭 타입 인스턴스 생성
      const factory = ts.factory;

      // Flatten<Nested> 같은 타입 참조 노드 생성
      const typeArgsNodes = typeArgs.map((arg) =>
        factory.createTypeReferenceNode(arg)
      );

      const instantiatedTypeNode = factory.createTypeReferenceNode(
        mappedTypeName,
        typeArgsNodes
      );

      // TypeChecker로 최종 타입 계산
      const finalType =
        context.checker.getTypeFromTypeNode(instantiatedTypeNode);
      const finalTypeString = context.checker.typeToString(finalType);

      console.log(`🔍 Final result from TypeChecker: ${finalTypeString}`);

      // 결과 타입 구조 분석
      const resultStructure = this.collector.createFinalTypeStructure(
        finalType,
        context
      );

      return {
        finalType,
        finalTypeString,
        resultStructure,
        isUnion: finalType.isUnion(),
        properties: this.extractPropertiesFromFinalType(finalType, context),
      };
    } catch (error) {
      console.log(`⚠️ Final result calculation failed: ${error}`);
      return null;
    }
  }

  /**
   * 🎯 핵심: 키별 매핑 과정 역공학
   */
  private reverseEngineerKeyMappings(
    pattern: MappingPattern,
    typeArgs: string[],
    finalResult: FinalMappingResult,
    context: TypeCollectionContext
  ): KeyAnalysis[] {
    const keyAnalyses: KeyAnalysis[] = [];

    try {
      // 1. 첫 번째 타입 인자에서 키들 추출 (예: Nested에서 "user", "active")
      const sourceKeys = this.extractSourceKeys(typeArgs[0], context);
      console.log(`🔍 Extracted source keys: ${sourceKeys.join(", ")}`);

      // 2. 각 키에 대해 TypeChecker로 매핑 과정 분석
      for (const key of sourceKeys) {
        const keyAnalysis = this.analyzeKeyMapping(
          key,
          pattern,
          typeArgs,
          context
        );
        if (keyAnalysis) {
          keyAnalyses.push(keyAnalysis);
        }
      }

      // 3. 최종 결과와 매칭하여 검증
      this.validateKeyAnalysisAgainstFinalResult(keyAnalyses, finalResult);
    } catch (error) {
      console.log(`⚠️ Key mapping reverse engineering failed: ${error}`);
    }

    return keyAnalyses;
  }

  /**
   * 🎯 단일 키에 대한 매핑 분석
   */
  private analyzeKeyMapping(
    key: string,
    pattern: MappingPattern,
    typeArgs: string[],
    context: TypeCollectionContext
  ): KeyAnalysis | null {
    try {
      console.log(`🔍 Analyzing key: "${key}"`);

      const steps: MappingStep[] = [];

      // Step 1: K = "key" 할당
      steps.push({
        stepType: "iterator-assignment",
        description: `Iterator variable assignment`,
        expression: `${pattern.iteratorVar} = "${key}"`,
        result: {
          type: "literal",
          value: `"${key}"`,
          metadata: { finalTypeString: `"${key}"` },
        },
      });

      // Step 2: T[K] 계산 (TypeChecker 사용)
      const indexAccessResult = this.calculateIndexAccessWithTypeChecker(
        key,
        typeArgs[0],
        context
      );

      if (indexAccessResult) {
        steps.push({
          stepType: "index-access",
          description: `Index access evaluation`,
          expression: `${typeArgs[0]}["${key}"]`,
          result: indexAccessResult,
        });
      }

      // Step 3: 조건부 타입 평가 (extends가 있는 경우)
      if (this.hasConditionalLogic(pattern)) {
        const conditionalResult = this.evaluateConditionalLogic(
          key,
          indexAccessResult,
          pattern,
          context
        );

        if (conditionalResult) {
          steps.push({
            stepType: "conditional-evaluation",
            description: `Conditional type evaluation`,
            expression: conditionalResult.condition,
            result: conditionalResult.branchResult,
          });

          // 선택된 브랜치의 추가 처리
          if (
            conditionalResult.selectedBranch === "true" &&
            conditionalResult.nestedMapping
          ) {
            const nestedSteps = this.analyzeNestedMapping(
              key,
              indexAccessResult,
              conditionalResult.nestedMapping,
              context
            );
            steps.push(...nestedSteps);
          }
        }
      }

      // Step 4: 최종 결과 매핑
      const finalMappingResult = this.calculateFinalKeyResult(
        key,
        pattern,
        typeArgs,
        context
      );
      if (finalMappingResult) {
        steps.push({
          stepType: "final-mapping",
          description: `Final mapped result`,
          expression: `Final result for "${key}"`,
          result: finalMappingResult,
        });
      }

      return {
        originalKey: key,
        finalKeys: this.extractFinalKeys(key, pattern, steps),
        steps,
        hasConditionalBranch: this.hasConditionalLogic(pattern),
        hasNestedMapping: this.detectNestedMapping(steps),
        metadata: {
          sourceType: indexAccessResult?.metadata?.finalTypeString || "unknown",
          analysisMethod: "typeChecker-reverse-engineering",
        },
      };
    } catch (error) {
      console.log(`⚠️ Key mapping analysis failed for "${key}": ${error}`);
      return null;
    }
  }

  /**
   * 🎯 중첩 매핑 분석 (복잡한 경우)
   */
  private analyzeNestedMapping(
    parentKey: string,
    parentType: TypeStructure | null,
    nestedPattern: any,
    context: TypeCollectionContext
  ): MappingStep[] {
    const nestedSteps: MappingStep[] = [];

    try {
      if (parentType && parentType.type === "object" && parentType.properties) {
        console.log(`🔍 Analyzing nested mapping for "${parentKey}"`);

        for (const prop of parentType.properties) {
          // 중첩된 키에 대한 템플릿 리터럴 처리
          const nestedKey = `${parentKey}.${prop.name}`;

          nestedSteps.push({
            stepType: "nested-mapping",
            description: `Nested property mapping`,
            expression: `"${parentKey}.${prop.name}" : ${
              prop.type.metadata?.finalTypeString || "unknown"
            }`,
            result: prop.type,
          });
        }
      }
    } catch (error) {
      console.log(`⚠️ Nested mapping analysis failed: ${error}`);
    }

    return nestedSteps;
  }

  /**
   * 🎯 TypeChecker를 이용한 인덱스 액세스 계산
   */
  private calculateIndexAccessWithTypeChecker(
    key: string,
    sourceTypeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
    try {
      // TypeScript factory로 T["key"] AST 생성
      const factory = ts.factory;

      const indexAccessNode = factory.createIndexedAccessTypeNode(
        factory.createTypeReferenceNode(sourceTypeName),
        factory.createLiteralTypeNode(factory.createStringLiteral(key))
      );

      // TypeChecker로 실제 타입 계산
      const resultType = context.checker.getTypeFromTypeNode(indexAccessNode);
      const resultStructure = this.collector.createFinalTypeStructure(
        resultType,
        context
      );

      console.log(
        `🔍 ${sourceTypeName}["${key}"] = ${context.checker.typeToString(
          resultType
        )}`
      );

      return resultStructure;
    } catch (error) {
      console.log(`⚠️ Index access calculation failed: ${error}`);
      return null;
    }
  }

  /**
   * 🎯 조건부 로직 평가 (T[K] extends object ? ... : ...)
   */
  private evaluateConditionalLogic(
    key: string,
    indexAccessResult: TypeStructure | null,
    pattern: MappingPattern,
    context: TypeCollectionContext
  ): ConditionalEvaluationResult | null {
    try {
      if (!indexAccessResult || !pattern.conditionalExpression) {
        return null;
      }

      // TypeChecker를 이용한 extends 조건 평가
      const extendsCondition = pattern.conditionalExpression.extendsType;
      const checkType = this.typeStructureToTsType(indexAccessResult, context);
      const extendsType = context.checker.getTypeFromTypeNode(extendsCondition);

      // 실제 assignability 체크
      const isAssignable = context.checker.isTypeAssignableTo(
        checkType,
        extendsType
      );

      console.log(
        `🔍 ${key}: T[K] extends ${extendsCondition.getText()} = ${isAssignable}`
      );

      // 선택된 브랜치 분석
      const selectedBranch = isAssignable ? "true" : "false";
      const branchNode = isAssignable
        ? pattern.conditionalExpression.trueType
        : pattern.conditionalExpression.falseType;

      const branchResult = this.collector.collect(branchNode, context);

      return {
        condition: `T["${key}"] extends ${extendsCondition.getText()}`,
        result: isAssignable,
        selectedBranch,
        branchResult,
        nestedMapping: isAssignable
          ? this.extractNestedMappingInfo(branchNode)
          : null,
      };
    } catch (error) {
      console.log(`⚠️ Conditional logic evaluation failed: ${error}`);
      return null;
    }
  }

  // === 헬퍼 메서드들 ===

  private findMappedTypeDeclaration(
    typeName: string,
    context: TypeCollectionContext
  ): ts.TypeAliasDeclaration | null {
    for (const statement of context.sourceFile.statements) {
      if (
        ts.isTypeAliasDeclaration(statement) &&
        statement.name?.text === typeName
      ) {
        return statement;
      }
    }
    return null;
  }

  private analyzeMappingPattern(
    declaration: ts.TypeAliasDeclaration
  ): MappingPattern {
    // 매핑 패턴 분석 로직
    // 예: { [K in keyof T]: ... } 구조 분석
    return {
      iteratorVar: "K", // 실제 AST에서 추출
      constraint: declaration.type, // 실제 constraint 노드
      valueExpression: declaration.type, // 실제 value 표현식
      conditionalExpression: null, // 조건부 타입이 있으면 분석
      hasKeyRemapping: false, // as 절 여부
    };
  }

  private extractSourceKeys(
    typeName: string,
    context: TypeCollectionContext
  ): string[] {
    try {
      // keyof T 계산
      const factory = ts.factory;
      const keyofNode = factory.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        factory.createTypeReferenceNode(typeName)
      );

      const keyofType = context.checker.getTypeFromTypeNode(keyofNode);

      if (keyofType.isUnion()) {
        return keyofType.types
          .map((t) => context.checker.typeToString(t))
          .map((s) => s.replace(/['"]/g, ""));
      }

      return [];
    } catch (error) {
      console.log(`⚠️ Source key extraction failed: ${error}`);
      return [];
    }
  }

  private hasConditionalLogic(pattern: MappingPattern): boolean {
    return pattern.conditionalExpression !== null;
  }

  private hasKeyRemapping(pattern: MappingPattern): boolean {
    return pattern.hasKeyRemapping;
  }

  private extractPropertiesFromFinalType(
    type: ts.Type,
    context: TypeCollectionContext
  ) {
    // 최종 타입에서 프로퍼티 추출
    return type.getProperties().map((prop) => ({
      name: prop.name,
      type: context.checker.getTypeOfSymbolAtLocation(
        prop,
        prop.valueDeclaration!
      ),
    }));
  }

  // ... 기타 헬퍼 메서드들
}

// === 타입 정의들 ===

interface MappingAnalysisResult {
  mappedTypeName: string;
  typeArgs: string[];
  pattern: MappingPattern;
  finalResult: FinalMappingResult;
  keyAnalysis: KeyAnalysis[];
  iterations: any[]; // 포맷터를 위한 이터레이션 구조
  metadata: {
    analysisMethod: string;
    totalKeys: number;
    hasConditionalLogic: boolean;
    hasKeyRemapping: boolean;
  };
}

interface MappingPattern {
  iteratorVar: string;
  constraint: ts.TypeNode;
  valueExpression: ts.TypeNode;
  conditionalExpression: ts.ConditionalTypeNode | null;
  hasKeyRemapping: boolean;
}

interface FinalMappingResult {
  finalType: ts.Type;
  finalTypeString: string;
  resultStructure: TypeStructure;
  isUnion: boolean;
  properties: Array<{ name: string; type: ts.Type }>;
}

interface KeyAnalysis {
  originalKey: string;
  finalKeys: string[];
  steps: MappingStep[];
  hasConditionalBranch: boolean;
  hasNestedMapping: boolean;
  metadata: {
    sourceType: string;
    analysisMethod: string;
  };
}

interface MappingStep {
  stepType:
    | "iterator-assignment"
    | "index-access"
    | "conditional-evaluation"
    | "nested-mapping"
    | "final-mapping";
  description: string;
  expression: string;
  result: TypeStructure;
}

interface ConditionalEvaluationResult {
  condition: string;
  result: boolean;
  selectedBranch: "true" | "false";
  branchResult: TypeStructure;
  nestedMapping: any | null;
}

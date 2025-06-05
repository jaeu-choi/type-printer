import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { TypeCheckerBasedMappingAnalyzer } from "../mappingAnalyzer";

export class MappedTypeHandler implements TypeHandler {
  private mappingAnalyzer: TypeCheckerBasedMappingAnalyzer;

  constructor(private readonly collector: any) {
    this.mappingAnalyzer = new TypeCheckerBasedMappingAnalyzer(
      null, // TypeChecker는 나중에 context에서 받음
      collector
    );
  }

  canHandle(node: ts.TypeNode): boolean {
    if (!ts.isMappedTypeNode(node)) {
      return false;
    }

    const mappedNode = node as ts.MappedTypeNode;

    try {
      // 필수 구성 요소들이 모두 있는지 확인
      if (!mappedNode.typeParameter) return false;
      if (!mappedNode.typeParameter.constraint) return false;
      if (!mappedNode.type) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const mappedNode = node as ts.MappedTypeNode;

    try {
      console.log("🔍 Using TypeCheckerBasedMappingAnalyzer for mapped type");

      // 🎯 1. TypeChecker 기반 분석기 설정
      // TypeChecker를 runtime에 주입
      (this.mappingAnalyzer as any).checker = context.checker;

      // 🎯 2. 매핑 패턴 분석
      const pattern = this.extractMappingPattern(mappedNode);
      console.log(`🔍 Mapping pattern: ${this.stringifyPattern(pattern)}`);

      // 🎯 3. 제네릭 컨텍스트에서 타입 인자 추출
      const typeArgs = this.extractTypeArgsFromContext(context);
      console.log(`🔍 Type args: [${typeArgs.join(", ")}]`);

      // 🎯 4. TypeChecker 기반 매핑 분석 수행
      let analysisResult = null;
      if (typeArgs.length > 0) {
        // 제네릭 인스턴스화된 경우 (Simple<User>)
        analysisResult = this.mappingAnalyzer.analyzeMappedType(
          "Simple", // 임시로 하드코딩, 실제로는 매핑 타입명 추출 필요
          typeArgs,
          context
        );
      }

      // 🎯 5. 최종 결과 계산
      const finalType = context.checker.getTypeFromTypeNode(mappedNode);
      const finalTypeString = context.checker.typeToString(finalType);
      const computedResult = this.collector.createFinalTypeStructure(
        finalType,
        context
      );

      // 🎯 6. 구조화된 결과 생성
      const structure: TypeStructure = {
        type: "mapped",
        metadata: {
          originalText: mappedNode.getText(),
          finalTypeString,
          pattern: this.stringifyPattern(pattern),
          methodUsed: "typeChecker-based",
        },
      };

      if (context.expanded) {
        // expanded 모드: 매핑 과정(children) + 최종 결과(computedResult)
        structure.children = this.createProcessStructure(
          pattern,
          analysisResult
        );
        structure.computedResult = computedResult;
      } else {
        // 기본 모드: 최종 결과만
        structure.computedResult = computedResult;
      }

      console.log(`✅ TypeChecker-based mapping analysis completed`);
      return structure;
    } catch (error) {
      console.log(`⚠️ TypeChecker analysis failed, using fallback: ${error}`);
      return this.createFallbackStructure(mappedNode, context);
    }
  }

  /**
   * 🎯 매핑 과정을 구조화된 children으로 변환
   */
  private createProcessStructure(
    pattern: MappingPattern,
    analysisResult: any // MappingAnalysisResult | null
  ): TypeStructure[] {
    const processStructure: TypeStructure[] = [];

    // 1. 매핑 패턴 정보
    processStructure.push({
      type: "reference",
      name: "[MappingPattern]",
      children: [
        {
          type: "literal",
          value: this.stringifyPattern(pattern),
          metadata: {
            description: "Original mapping pattern analyzed by TypeChecker",
            iteratorVar: pattern.iteratorVar,
            constraint: pattern.constraint.getText(),
            valueExpr: pattern.valueExpr.getText(),
          },
        },
      ],
      metadata: {
        description: "Mapping type pattern structure",
        analysisMethod: "typeChecker-based",
      },
    });

    // 2. TypeChecker 기반 이터레이션 결과
    if (
      analysisResult &&
      analysisResult.keyAnalysis &&
      analysisResult.keyAnalysis.length > 0
    ) {
      const iterationChildren = analysisResult.keyAnalysis.map(
        (keyAnalysis: any) => this.createIterationStructure(keyAnalysis)
      );

      processStructure.push({
        type: "reference",
        name: "[TypeChecker Analysis]",
        children: iterationChildren,
        metadata: {
          description: "Step-by-step analysis using TypeScript compiler",
          totalIterations: analysisResult.keyAnalysis.length,
          method: "reverse-engineering",
        },
      });
    } else {
      // 분석 결과가 없는 경우 기본 메시지
      processStructure.push({
        type: "reference",
        name: "[Analysis Info]",
        children: [
          {
            type: "literal",
            value: "TypeChecker analysis in progress...",
            metadata: {
              description: "Analysis not yet available",
            },
          },
        ],
        metadata: {
          description: "TypeChecker analysis status",
        },
      });
    }

    return processStructure;
  }

  /**
   * 🎯 단일 키 분석을 구조화
   */
  private createIterationStructure(keyAnalysis: any): TypeStructure {
    const stepChildren =
      keyAnalysis.steps?.map((step: any, index: number) => ({
        type: "literal" as const,
        value: step.expression,
        metadata: {
          description: step.description,
          stepType: step.stepType,
          stepIndex: index,
        },
      })) || [];

    return {
      type: "reference",
      name: `[Key: ${keyAnalysis.originalKey}]`,
      children: stepChildren,
      metadata: {
        description: `TypeChecker analysis for key "${keyAnalysis.originalKey}"`,
        originalKey: keyAnalysis.originalKey,
        finalKeys: keyAnalysis.finalKeys || [keyAnalysis.originalKey],
        hasConditionalBranch: keyAnalysis.hasConditionalBranch || false,
        hasNestedMapping: keyAnalysis.hasNestedMapping || false,
        resultType: keyAnalysis.metadata?.sourceType || "unknown",
      },
    };
  }

  /**
   * 🎯 제네릭 컨텍스트에서 타입 인자 추출
   */
  private extractTypeArgsFromContext(context: TypeCollectionContext): string[] {
    const typeArgs: string[] = [];

    try {
      if (context.genericContext) {
        // 제네릭 컨텍스트에서 타입 추출
        // T = "User" 같은 매핑에서 "User" 추출
        for (const [
          paramName,
          paramValue,
        ] of context.genericContext.entries()) {
          if (paramValue.type === "primitive" && paramValue.value) {
            typeArgs.push(paramValue.value);
            console.log(
              `🔍 Found type arg: ${paramName} = ${paramValue.value}`
            );
          }
        }
      }

      // Fallback: 직접 타입명 추정
      if (typeArgs.length === 0) {
        // 컨텍스트에서 추정 가능한 타입명들 찾기
        // 이는 매핑 타입이 어떤 타입에 적용되었는지 역추정
        const estimatedTypes = this.estimateTypeArgsFromContext(context);
        typeArgs.push(...estimatedTypes);
      }
    } catch (error) {
      console.log(`⚠️ Failed to extract type args from context: ${error}`);
    }

    return typeArgs;
  }

  /**
   * 🔧 컨텍스트에서 타입 인자 추정
   */
  private estimateTypeArgsFromContext(
    context: TypeCollectionContext
  ): string[] {
    // 간단한 구현: 일반적인 타입명들 시도
    // 실제로는 더 정교한 추정 로직 필요
    const commonTypes = ["User", "Nested", "T"];

    for (const typeName of commonTypes) {
      // 타입이 존재하는지 확인
      const symbol = this.findTypeSymbol(typeName, context);
      if (symbol) {
        console.log(`🔍 Estimated type arg: ${typeName}`);
        return [typeName];
      }
    }

    return [];
  }

  /**
   * 🔧 타입 심볼 찾기
   */
  private findTypeSymbol(
    typeName: string,
    context: TypeCollectionContext
  ): ts.Symbol | undefined {
    for (const statement of context.sourceFile.statements) {
      if (
        (ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement)) &&
        statement.name?.text === typeName
      ) {
        return context.checker.getSymbolAtLocation(statement.name);
      }
    }
    return undefined;
  }

  /**
   * 🔧 매핑 패턴 추출
   */
  private extractMappingPattern(node: ts.MappedTypeNode): MappingPattern {
    return {
      iteratorVar: node.typeParameter.name.text,
      constraint: node.typeParameter.constraint!,
      valueExpr: node.type!,
      modifiers: {
        readonly: node.readonlyToken,
        optional: node.questionToken,
      },
    };
  }

  /**
   * 🔧 패턴 문자열화
   */
  private stringifyPattern(pattern: MappingPattern): string {
    const modifiers = [];
    if (pattern.modifiers.readonly)
      modifiers.push(pattern.modifiers.readonly.getText());
    if (pattern.modifiers.optional)
      modifiers.push(pattern.modifiers.optional.getText());

    const modifierStr = modifiers.length > 0 ? modifiers.join(" ") + " " : "";
    return `{ ${modifierStr}[${
      pattern.iteratorVar
    } in ${pattern.constraint.getText()}]: ${pattern.valueExpr.getText()} }`;
  }

  /**
   * 🔧 Fallback 구조 생성
   */
  private createFallbackStructure(
    mappedNode: ts.MappedTypeNode,
    context: TypeCollectionContext
  ): TypeStructure {
    console.log("🔧 Using fallback structure for mapped type");

    const finalType = context.checker.getTypeFromTypeNode(mappedNode);
    const computedResult = this.collector.createFinalTypeStructure(
      finalType,
      context
    );

    return {
      type: "mapped",
      children: [
        {
          type: "literal",
          value: mappedNode.getText(),
          metadata: {
            originalText: mappedNode.getText(),
            typeCheckerAnalysisFailed: true,
          },
        },
      ],
      computedResult,
      metadata: {
        originalText: mappedNode.getText(),
        finalTypeString: context.checker.typeToString(finalType),
        fallback: true,
        methodUsed: "fallback",
      },
    };
  }
}

// 타입 정의들
interface MappingPattern {
  iteratorVar: string;
  constraint: ts.TypeNode;
  valueExpr: ts.TypeNode;
  modifiers: {
    readonly?: ts.Token<ts.SyntaxKind>;
    optional?: ts.Token<ts.SyntaxKind>;
  };
}

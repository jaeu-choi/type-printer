// import * as ts from "typescript";
// import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";

// export class MappedTypeHandler implements TypeHandler {
//   constructor(private readonly collector: any) {}

//   canHandle(node: ts.TypeNode): boolean {
//     if (!ts.isMappedTypeNode(node)) {
//       return false;
//     }

//     const mappedNode = node as ts.MappedTypeNode;

//     try {
//       // 필수 구성 요소들이 모두 있는지 확인
//       if (!mappedNode.typeParameter) return false;
//       if (!mappedNode.typeParameter.constraint) return false;
//       if (!mappedNode.type) return false;

//       return true;
//     } catch (error) {
//       return false;
//     }
//   }

//   handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
//     const mappedNode = node as ts.MappedTypeNode;

//     try {
//       console.log("🔍 Using enhanced MappedTypeHandler for iteration analysis");

//       // 🎯 1. 기본 패턴 분석
//       const pattern = this.extractMappingPattern(mappedNode);
//       console.log(`🔍 Mapping pattern: ${this.stringifyPattern(pattern)}`);

//       // 🎯 2. 간단한 이터레이션 분석 (TypeChecker 기반)
//       const iterations = this.analyzeIterationsDirectly(mappedNode, context);

//       // 🎯 3. 최종 결과 계산
//       const finalType = context.checker.getTypeFromTypeNode(mappedNode);
//       const finalTypeString = context.checker.typeToString(finalType);
//       const computedResult = this.collector.createFinalTypeStructure(
//         finalType,
//         context
//       );

//       // 🎯 4. 구조화된 결과 생성
//       const structure: TypeStructure = {
//         type: "mapped",
//         metadata: {
//           originalText: mappedNode.getText(),
//           finalTypeString,
//           pattern: this.stringifyPattern(pattern),
//           methodUsed: "enhanced-direct",
//         },
//       };

//       if (context.expanded) {
//         // expanded 모드: 매핑 과정(children) + 최종 결과(computedResult)
//         structure.children = this.createProcessStructureSimple(
//           pattern,
//           iterations
//         );
//         structure.computedResult = computedResult;
//       } else {
//         // 기본 모드: 최종 결과만
//         structure.computedResult = computedResult;
//       }

//       console.log(
//         `✅ Enhanced mapping analysis completed with ${iterations.length} iterations`
//       );
//       return structure;
//     } catch (error) {
//       console.log(`⚠️ Enhanced analysis failed, using fallback: ${error}`);
//       return this.createFallbackStructure(mappedNode, context);
//     }
//   }

//   /**
//    * 🎯 직접적인 이터레이션 분석 (간단한 방법)
//    */
//   private analyzeIterationsDirectly(
//     mappedNode: ts.MappedTypeNode,
//     context: TypeCollectionContext
//   ): IterationInfo[] {
//     const iterations: IterationInfo[] = [];

//     try {
//       // 1. constraint에서 키들 추출
//       const constraintNode = mappedNode.typeParameter.constraint!;
//       const keys = this.extractKeysFromConstraint(constraintNode, context);

//       console.log(`🔍 Extracted keys: [${keys.join(", ")}]`);

//       // 2. 각 키에 대해 매핑 과정 분석
//       for (const key of keys) {
//         const iteration = this.analyzeKeyIteration(key, mappedNode, context);
//         if (iteration) {
//           iterations.push(iteration);
//         }
//       }
//     } catch (error) {
//       console.log(`⚠️ Direct iteration analysis failed: ${error}`);
//     }

//     return iterations;
//   }

//   /**
//    * 🎯 단일 키 이터레이션 분석
//    */
//   private analyzeKeyIteration(
//     key: string,
//     mappedNode: ts.MappedTypeNode,
//     context: TypeCollectionContext
//   ): IterationInfo | null {
//     try {
//       const iteratorVar = mappedNode.typeParameter.name.text;
//       const valueExpr = mappedNode.type!;

//       // Step 1: K = "key"
//       const step1 = `${iteratorVar} = "${key}"`;

//       // Step 2: T[K] 계산 (TypeChecker 사용)
//       const indexAccessResult = this.calculateIndexAccess(key, context);
//       const step2 = `T[${iteratorVar}] = T["${key}"] = ${indexAccessResult}`;

//       // Step 3: 최종 value expression 계산
//       const finalResult = this.calculateValueExpression(
//         key,
//         valueExpr,
//         context
//       );
//       const step3 = `${valueExpr.getText()} = ${finalResult}`;

//       return {
//         key,
//         steps: [
//           { expression: step1, description: "Iterator variable assignment" },
//           { expression: step2, description: "Index access evaluation" },
//           { expression: step3, description: "Value expression result" },
//         ],
//       };
//     } catch (error) {
//       console.log(`⚠️ Key iteration analysis failed for "${key}": ${error}`);
//       return null;
//     }
//   }

//   /**
//    * 🎯 constraint에서 키들 추출 (TypeChecker 기반)
//    */
//   private extractKeysFromConstraint(
//     constraintNode: ts.TypeNode,
//     context: TypeCollectionContext
//   ): string[] {
//     try {
//       // keyof T 형태의 constraint에서 실제 키들 추출
//       const constraintType =
//         context.checker.getTypeFromTypeNode(constraintNode);

//       if (constraintType.isUnion()) {
//         // "name" | "age" 형태의 union에서 각 리터럴 추출
//         return constraintType.types
//           .map((t) => context.checker.typeToString(t))
//           .map((s) => s.replace(/['"]/g, "")) // 따옴표 제거
//           .filter((s) => s && s !== "never");
//       }

//       // 단일 키인 경우
//       const keyString = context.checker.typeToString(constraintType);
//       if (keyString.includes('"') || keyString.includes("'")) {
//         return [keyString.replace(/['"]/g, "")];
//       }

//       // 추정 불가능한 경우 빈 배열
//       return [];
//     } catch (error) {
//       console.log(`⚠️ Key extraction failed: ${error}`);
//       return [];
//     }
//   }

//   /**
//    * 🎯 인덱스 액세스 계산 (T["key"])
//    */
//   private calculateIndexAccess(
//     key: string,
//     context: TypeCollectionContext
//   ): string {
//     try {
//       // TypeScript factory로 T["key"] 노드 생성
//       const factory = ts.factory;

//       // 간단한 구현: T 타입 참조 생성
//       const indexAccessNode = factory.createIndexedAccessTypeNode(
//         factory.createTypeReferenceNode("T"),
//         factory.createLiteralTypeNode(factory.createStringLiteral(key))
//       );

//       // TypeChecker로 실제 타입 계산
//       const resultType = context.checker.getTypeFromTypeNode(indexAccessNode);
//       return context.checker.typeToString(resultType);
//     } catch (error) {
//       // Fallback: 제네릭 컨텍스트에서 추정
//       console.log(
//         `⚠️ Index access calculation failed, using fallback: ${error}`
//       );
//       return this.fallbackIndexAccess(key, context);
//     }
//   }

//   /**
//    * 🔧 인덱스 액세스 fallback
//    */
//   private fallbackIndexAccess(
//     key: string,
//     context: TypeCollectionContext
//   ): string {
//     // 제네릭 컨텍스트나 최종 결과에서 추정
//     if (context.genericContext) {
//       // T = SomeType인 경우 SomeType[key] 계산 시도
//       for (const [paramName, paramValue] of context.genericContext.entries()) {
//         if (
//           paramName === "T" &&
//           paramValue.type === "object" &&
//           paramValue.properties
//         ) {
//           const prop = paramValue.properties.find((p) => p.name === key);
//           if (prop && prop.type.metadata?.finalTypeString) {
//             return prop.type.metadata.finalTypeString;
//           }
//         }
//       }
//     }

//     return "unknown";
//   }

//   /**
//    * 🎯 value expression 계산
//    */
//   private calculateValueExpression(
//     key: string,
//     valueExpr: ts.TypeNode,
//     context: TypeCollectionContext
//   ): string {
//     try {
//       // 키별 제네릭 컨텍스트 생성
//       const keyContext = this.createKeyContext(key, context);

//       // value expression을 collector로 계산
//       const result = this.collector.collect(valueExpr, keyContext);
//       return result.metadata?.finalTypeString || result.value || "unknown";
//     } catch (error) {
//       console.log(`⚠️ Value expression calculation failed: ${error}`);
//       return "unknown";
//     }
//   }

//   /**
//    * 🔧 키별 컨텍스트 생성
//    */
//   private createKeyContext(
//     key: string,
//     originalContext: TypeCollectionContext
//   ): TypeCollectionContext {
//     const genericContext = new Map(originalContext.genericContext);

//     // K = "key" 바인딩 추가
//     genericContext.set("K", {
//       type: "literal",
//       value: `"${key}"`,
//       metadata: { finalTypeString: `"${key}"` },
//     });

//     return {
//       ...originalContext,
//       genericContext,
//     };
//   }

//   /**
//    * 🎯 간단한 Process 구조 생성
//    */
//   private createProcessStructureSimple(
//     pattern: MappingPattern,
//     iterations: IterationInfo[]
//   ): TypeStructure[] {
//     const processStructure: TypeStructure[] = [];

//     // 1. 매핑 패턴 정보
//     processStructure.push({
//       type: "reference",
//       name: "[MappingPattern]",
//       children: [
//         {
//           type: "literal",
//           value: this.stringifyPattern(pattern),
//           metadata: {
//             description: "Original mapping pattern",
//           },
//         },
//       ],
//       metadata: {
//         description: "Mapping type pattern structure",
//       },
//     });

//     // 2. 이터레이션 과정
//     if (iterations.length > 0) {
//       const iterationChildren = iterations.map((iteration) => ({
//         type: "reference" as const,
//         name: `[Key: ${iteration.key}]`,
//         children: iteration.steps.map((step) => ({
//           type: "literal" as const,
//           value: step.expression,
//           metadata: {
//             description: step.description,
//           },
//         })),
//         metadata: {
//           description: `Mapping iteration for key "${iteration.key}"`,
//           keyValue: iteration.key,
//         },
//       }));

//       processStructure.push({
//         type: "reference",
//         name: "[Iterations]",
//         children: iterationChildren,
//         metadata: {
//           description: "Key-by-key mapping iterations",
//           totalIterations: iterations.length,
//         },
//       });
//     }

//     return processStructure;
//   }

//   /**
//    * 🎯 매핑 과정을 구조화된 children으로 변환
//    */
//   private createProcessStructure(
//     pattern: MappingPattern,
//     analysisResult: any // MappingAnalysisResult | null
//   ): TypeStructure[] {
//     const processStructure: TypeStructure[] = [];

//     // 1. 매핑 패턴 정보
//     processStructure.push({
//       type: "reference",
//       name: "[MappingPattern]",
//       children: [
//         {
//           type: "literal",
//           value: this.stringifyPattern(pattern),
//           metadata: {
//             description: "Original mapping pattern analyzed by TypeChecker",
//             iteratorVar: pattern.iteratorVar,
//             constraint: pattern.constraint.getText(),
//             valueExpr: pattern.valueExpr.getText(),
//           },
//         },
//       ],
//       metadata: {
//         description: "Mapping type pattern structure",
//         analysisMethod: "typeChecker-based",
//       },
//     });

//     // 2. TypeChecker 기반 이터레이션 결과
//     if (
//       analysisResult &&
//       analysisResult.keyAnalysis &&
//       analysisResult.keyAnalysis.length > 0
//     ) {
//       const iterationChildren = analysisResult.keyAnalysis.map(
//         (keyAnalysis: any) => this.createIterationStructure(keyAnalysis)
//       );

//       processStructure.push({
//         type: "reference",
//         name: "[TypeChecker Analysis]",
//         children: iterationChildren,
//         metadata: {
//           description: "Step-by-step analysis using TypeScript compiler",
//           totalIterations: analysisResult.keyAnalysis.length,
//           method: "reverse-engineering",
//         },
//       });
//     } else {
//       // 분석 결과가 없는 경우 기본 메시지
//       processStructure.push({
//         type: "reference",
//         name: "[Analysis Info]",
//         children: [
//           {
//             type: "literal",
//             value: "TypeChecker analysis in progress...",
//             metadata: {
//               description: "Analysis not yet available",
//             },
//           },
//         ],
//         metadata: {
//           description: "TypeChecker analysis status",
//         },
//       });
//     }

//     return processStructure;
//   }

//   /**
//    * 🎯 단일 키 분석을 구조화
//    */
//   private createIterationStructure(keyAnalysis: any): TypeStructure {
//     const stepChildren =
//       keyAnalysis.steps?.map((step: any, index: number) => ({
//         type: "literal" as const,
//         value: step.expression,
//         metadata: {
//           description: step.description,
//           stepType: step.stepType,
//           stepIndex: index,
//         },
//       })) || [];

//     return {
//       type: "reference",
//       name: `[Key: ${keyAnalysis.originalKey}]`,
//       children: stepChildren,
//       metadata: {
//         description: `TypeChecker analysis for key "${keyAnalysis.originalKey}"`,
//         originalKey: keyAnalysis.originalKey,
//         finalKeys: keyAnalysis.finalKeys || [keyAnalysis.originalKey],
//         hasConditionalBranch: keyAnalysis.hasConditionalBranch || false,
//         hasNestedMapping: keyAnalysis.hasNestedMapping || false,
//         resultType: keyAnalysis.metadata?.sourceType || "unknown",
//       },
//     };
//   }

//   /**
//    * 🔧 매핑 패턴 추출
//    */
//   private extractMappingPattern(node: ts.MappedTypeNode): MappingPattern {
//     return {
//       iteratorVar: node.typeParameter.name.text,
//       constraint: node.typeParameter.constraint!,
//       valueExpr: node.type!,
//       modifiers: {
//         readonly: node.readonlyToken,
//         optional: node.questionToken,
//       },
//     };
//   }

//   /**
//    * 🔧 패턴 문자열화
//    */
//   private stringifyPattern(pattern: MappingPattern): string {
//     const modifiers = [];
//     if (pattern.modifiers.readonly)
//       modifiers.push(pattern.modifiers.readonly.getText());
//     if (pattern.modifiers.optional)
//       modifiers.push(pattern.modifiers.optional.getText());

//     const modifierStr = modifiers.length > 0 ? modifiers.join(" ") + " " : "";
//     return `{ ${modifierStr}[${
//       pattern.iteratorVar
//     } in ${pattern.constraint.getText()}]: ${pattern.valueExpr.getText()} }`;
//   }

//   /**
//    * 🔧 Fallback 구조 생성
//    */
//   private createFallbackStructure(
//     mappedNode: ts.MappedTypeNode,
//     context: TypeCollectionContext
//   ): TypeStructure {
//     console.log("🔧 Using fallback structure for mapped type");

//     const finalType = context.checker.getTypeFromTypeNode(mappedNode);
//     const computedResult = this.collector.createFinalTypeStructure(
//       finalType,
//       context
//     );

//     return {
//       type: "mapped",
//       children: [
//         {
//           type: "literal",
//           value: mappedNode.getText(),
//           metadata: {
//             originalText: mappedNode.getText(),
//             enhancedAnalysisFailed: true,
//           },
//         },
//       ],
//       computedResult,
//       metadata: {
//         originalText: mappedNode.getText(),
//         finalTypeString: context.checker.typeToString(finalType),
//         fallback: true,
//         methodUsed: "fallback",
//       },
//     };
//   }
// }

// // 타입 정의들
// interface MappingPattern {
//   iteratorVar: string;
//   constraint: ts.TypeNode;
//   valueExpr: ts.TypeNode;
//   modifiers: {
//     readonly?: ts.Token<ts.SyntaxKind>;
//     optional?: ts.Token<ts.SyntaxKind>;
//   };
// }

// interface IterationInfo {
//   key: string;
//   steps: Array<{
//     expression: string;
//     description: string;
//   }>;
// }

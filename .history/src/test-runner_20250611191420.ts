// // test-runner.ts - ConditionalTypeHandler 실제 테스트 실행 스크립트

// import * as ts from "typescript";
// import * as fs from "fs";
// import * as path from "path";
// import {
//   createTypeCreationContext,
//   TypeCreationContext,
//   TypeNode,
// } from "./src/ir";
// import { ConditionalTypeHandler } from "./src/handlers/conditionalTypeHandler";
// import {
//   globalHandlerRegistry,
//   setGlobalDebugMode,
//   printTerminalOptimizationStats,
// } from "./src/handlers/registry";
// import {
//   initializeAvailableHandlers,
//   // testConditionalTypeHandler,
//   // testConditionalTypeHandlerWithRealTypes,
//   // testHandlerInteractions,
// } from "./src/handlers/setup";

// /**
//  * 🚀 ConditionalTypeHandler 통합 테스트 러너
//  *
//  * 실행 방법:
//  * ```bash
//  * npx ts-node test-runner.ts
//  * ```
//  */

// interface TestResult {
//   name: string;
//   passed: boolean;
//   error?: string;
//   details?: any;
// }

// class ConditionalTypeTestRunner {
//   private results: TestResult[] = [];
//   private handler: ConditionalTypeHandler;

//   constructor() {
//     this.handler = new ConditionalTypeHandler();
//   }

//   async runAllTests(): Promise<void> {
//     console.log("🚀 Starting ConditionalTypeHandler Integration Tests");
//     console.log("=".repeat(60));

//     // 시스템 초기화
//     await this.initializeSystem();

//     // 기본 테스트들
//     await this.runBasicTests();

//     // 실제 TypeScript 코드 테스트
//     await this.runRealCodeTests();

//     // 핸들러 상호작용 테스트
//     await this.runHandlerInteractionTests();

//     // IR 구조 검증 테스트
//     await this.runIRValidationTests();

//     // 성능 테스트
//     await this.runPerformanceTests();

//     // 결과 출력
//     this.printResults();
//   }

//   private async initializeSystem(): Promise<void> {
//     console.log("\n🔧 Initializing handler system...");

//     try {
//       setGlobalDebugMode(true);
//       initializeAvailableHandlers();

//       const registryInfo = globalHandlerRegistry.getRegisteredHandlers();
//       console.log(`✅ Initialized ${registryInfo.length} handlers`);

//       // ConditionalTypeHandler가 등록되었는지 확인
//       const conditionalHandler = registryInfo.find(
//         (h) => h.name === "ConditionalTypeHandler"
//       );
//       if (!conditionalHandler) {
//         throw new Error("ConditionalTypeHandler not found in registry");
//       }

//       console.log(
//         `✅ ConditionalTypeHandler found with priority: ${conditionalHandler.priority}`
//       );

//       this.results.push({
//         name: "System Initialization",
//         passed: true,
//         details: { handlerCount: registryInfo.length },
//       });
//     } catch (error) {
//       this.results.push({
//         name: "System Initialization",
//         passed: false,
//         error: String(error),
//       });
//       throw error;
//     }
//   }

//   private async runBasicTests(): Promise<void> {
//     console.log("\n🧪 Running basic ConditionalTypeHandler tests...");

//     // 테스트 1: 기본 조건부 타입
//     await this.runTest("Basic Conditional Type", () => {
//       const sourceCode = `type IsString<T> = T extends string ? "yes" : "no";`;
//       const result = this.analyzeTypeAlias(sourceCode, "IsString");

//       if (result.kind !== "conditional") {
//         throw new Error(`Expected conditional, got ${result.kind}`);
//       }

//       if (!result.conditionalInfo) {
//         throw new Error("Missing conditionalInfo");
//       }

//       if (
//         !result.metadata?.educationalSteps ||
//         result.metadata.educationalSteps.length === 0
//       ) {
//         throw new Error("Missing educational steps");
//       }

//       return {
//         kind: result.kind,
//         hasConditionalInfo: !!result.conditionalInfo,
//         educationalSteps: result.metadata?.educationalSteps?.length || 0,
//       };
//     });

//     // 테스트 2: infer를 포함한 조건부 타입
//     await this.runTest("Conditional Type with Infer", () => {
//       const sourceCode = `type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;`;
//       const result = this.analyzeTypeAlias(sourceCode, "ReturnType");

//       if (result.kind !== "conditional") {
//         throw new Error(`Expected conditional, got ${result.kind}`);
//       }

//       const hasInfer = result.metadata?.conditionalEvaluationInfo?.hasInfer;
//       if (!hasInfer) {
//         throw new Error("infer not detected in conditional type");
//       }

//       const complexityLevel =
//         result.metadata?.conditionalEvaluationInfo?.complexityLevel;
//       if (complexityLevel === "simple") {
//         throw new Error(
//           "Expected moderate or complex complexity for infer type"
//         );
//       }

//       return {
//         kind: result.kind,
//         hasInfer: hasInfer,
//         complexityLevel: complexityLevel,
//         educationalSteps: result.metadata?.educationalSteps?.length || 0,
//       };
//     });

//     // 테스트 3: 복합 infer 패턴
//     await this.runTest("Complex Infer Pattern", () => {
//       const sourceCode = `type TemplateInfer<T> = T extends \`\${infer A}-\${infer B}\` ? [A, B] : never;`;
//       const result = this.analyzeTypeAlias(sourceCode, "TemplateInfer");

//       if (result.kind !== "conditional") {
//         throw new Error(`Expected conditional, got ${result.kind}`);
//       }

//       const complexityLevel =
//         result.metadata?.conditionalEvaluationInfo?.complexityLevel;
//       if (complexityLevel !== "complex") {
//         throw new Error(`Expected complex complexity, got ${complexityLevel}`);
//       }

//       const hasInfer = result.metadata?.conditionalEvaluationInfo?.hasInfer;
//       if (!hasInfer) {
//         throw new Error("infer not detected in template literal pattern");
//       }

//       return {
//         kind: result.kind,
//         complexityLevel: complexityLevel,
//         hasInfer: hasInfer,
//       };
//     });

//     // 테스트 4: 분산 조건부 타입
//     await this.runTest("Distributive Conditional Type", () => {
//       const sourceCode = `type Distribute<T> = T extends any ? T[] : never;`;
//       const result = this.analyzeTypeAlias(sourceCode, "Distribute");

//       const isDistributive =
//         result.metadata?.conditionalEvaluationInfo?.isDistributive;
//       if (!isDistributive) {
//         throw new Error("Distributive pattern not detected");
//       }

//       return {
//         kind: result.kind,
//         isDistributive: isDistributive,
//       };
//     });
//   }

//   private async runRealCodeTests(): Promise<void> {
//     console.log("\n🔍 Running real TypeScript code tests...");

//     // 실제 복합 조건부 타입들
//     const complexTypes = [
//       {
//         name: "ArrayElement",
//         code: `type ArrayElement<T> = T extends (infer U)[] ? U : never;`,
//         expectedFeatures: { hasInfer: true, complexityLevel: "moderate" },
//       },
//       {
//         name: "PromiseType",
//         code: `type PromiseType<T> = T extends Promise<infer V> ? V : never;`,
//         expectedFeatures: { hasInfer: true, complexityLevel: "moderate" },
//       },
//       {
//         name: "PropertyInfer",
//         code: `type PropertyInfer<T> = T extends { prop: infer P } ? P : never;`,
//         expectedFeatures: { hasInfer: true, complexityLevel: "moderate" },
//       },
//       {
//         name: "FunctionChain",
//         code: `type FunctionChain<T> = T extends (arg: infer A) => (result: infer B) => any ? [A, B] : never;`,
//         expectedFeatures: { hasInfer: true, complexityLevel: "complex" },
//       },
//       {
//         name: "DeepConditional",
//         code: `type DeepConditional<T> = T extends Promise<infer U> ? U extends Array<infer V> ? V : never : never;`,
//         expectedFeatures: { hasInfer: true, complexityLevel: "complex" },
//       },
//     ];

//     for (const testCase of complexTypes) {
//       await this.runTest(`Real Code - ${testCase.name}`, () => {
//         const result = this.analyzeTypeAlias(testCase.code, testCase.name);

//         // 기본 구조 검증
//         if (result.kind !== "conditional") {
//           throw new Error(`Expected conditional, got ${result.kind}`);
//         }

//         // 예상 특성 검증
//         const evalInfo = result.metadata?.conditionalEvaluationInfo;
//         if (!evalInfo) {
//           throw new Error("Missing conditionalEvaluationInfo");
//         }

//         if (testCase.expectedFeatures.hasInfer && !evalInfo.hasInfer) {
//           throw new Error("Expected infer detection");
//         }

//         if (
//           testCase.expectedFeatures.complexityLevel &&
//           evalInfo.complexityLevel !== testCase.expectedFeatures.complexityLevel
//         ) {
//           throw new Error(
//             `Expected complexity ${testCase.expectedFeatures.complexityLevel}, got ${evalInfo.complexityLevel}`
//           );
//         }

//         return {
//           kind: result.kind,
//           hasInfer: evalInfo.hasInfer,
//           complexityLevel: evalInfo.complexityLevel,
//           childrenCount: result.children?.length || 0,
//         };
//       });
//     }
//   }

//   private async runHandlerInteractionTests(): Promise<void> {
//     console.log("\n🔗 Running handler interaction tests...");

//     // 핸들러 호출 추적
//     const handlerCalls: Array<{ kind: string; handlerName?: string }> = [];
//     const originalCreateTypeNode = globalHandlerRegistry.createTypeNode;

//     // Mock으로 핸들러 호출 추적
//     globalHandlerRegistry.createTypeNode = function (type, node, context) {
//       const result = originalCreateTypeNode.call(this, type, node, context);
//       handlerCalls.push({
//         kind: result.kind,
//         handlerName: result.metadata?.handlerUsed || "unknown",
//       });
//       return result;
//     };

//     await this.runTest("Handler Interaction Tracking", () => {
//       handlerCalls.length = 0; // 초기화

//       // 복합 조건부 타입 분석
//       const sourceCode = `
//         type User = { name: string; age: number };
//         type ExtractName<T> = T extends { name: infer N } ? N : never;
//       `;

//       const result = this.analyzeMultipleTypes(sourceCode, [
//         "User",
//         "ExtractName",
//       ]);

//       // ExtractName 분석 결과 확인
//       const extractName = result.find((r) => r.typeName === "ExtractName");
//       if (!extractName) {
//         throw new Error("ExtractName not found in results");
//       }

//       // 핸들러 호출 확인
//       if (handlerCalls.length === 0) {
//         throw new Error("No handler calls detected");
//       }

//       const uniqueKinds = [...new Set(handlerCalls.map((call) => call.kind))];

//       return {
//         totalCalls: handlerCalls.length,
//         uniqueKinds: uniqueKinds,
//         handlerCallDetails: handlerCalls,
//       };
//     });

//     // 원래 함수 복원
//     globalHandlerRegistry.createTypeNode = originalCreateTypeNode;
//   }

//   private async runIRValidationTests(): Promise<void> {
//     console.log("\n📊 Running IR structure validation tests...");

//     await this.runTest("Complete IR Structure", () => {
//       const sourceCode = `type ComplexConditional<T> = T extends Promise<infer U> ? U extends string ? "text" : "other" : never;`;
//       const result = this.analyzeTypeAlias(sourceCode, "ComplexConditional");

//       // IR 구조 검증
//       const validationResult = this.validateIRStructure(result);

//       if (!validationResult.isValid) {
//         throw new Error(
//           `IR validation failed: ${validationResult.errors.join(", ")}`
//         );
//       }

//       return validationResult;
//     });

//     await this.runTest("Educational Steps Quality", () => {
//       const sourceCode = `type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;`;
//       const result = this.analyzeTypeAlias(sourceCode, "ReturnType");

//       const educationalSteps = result.metadata?.educationalSteps || [];

//       // 교육적 단계 품질 검증
//       const qualityMetrics = this.analyzeEducationalQuality(educationalSteps);

//       if (qualityMetrics.score < 0.7) {
//         throw new Error(`Educational quality too low: ${qualityMetrics.score}`);
//       }

//       return qualityMetrics;
//     });
//   }

//   private async runPerformanceTests(): Promise<void> {
//     console.log("\n⚡ Running performance tests...");

//     await this.runTest("Performance Benchmark", () => {
//       const complexType = `
//         type DeepNested<T> = T extends Promise<infer U>
//           ? U extends Array<infer V>
//             ? V extends { prop: infer P }
//               ? P extends string
//                 ? "deep-string"
//                 : "deep-other"
//               : "not-object"
//             : "not-array"
//           : "not-promise";
//       `;

//       const iterations = 10;
//       const startTime = performance.now();

//       for (let i = 0; i < iterations; i++) {
//         this.analyzeTypeAlias(complexType, "DeepNested");
//       }

//       const endTime = performance.now();
//       const avgTime = (endTime - startTime) / iterations;

//       // 성능 기준: 평균 50ms 이하
//       if (avgTime > 50) {
//         throw new Error(
//           `Performance too slow: ${avgTime.toFixed(2)}ms per analysis`
//         );
//       }

//       return {
//         iterations,
//         totalTime: endTime - startTime,
//         averageTime: avgTime,
//       };
//     });
//   }

//   // ==============================
//   // 🔧 헬퍼 메서드들
//   // ==============================

//   private async runTest(name: string, testFn: () => any): Promise<void> {
//     try {
//       console.log(`   🧪 ${name}...`);
//       const result = await testFn();
//       this.results.push({
//         name,
//         passed: true,
//         details: result,
//       });
//       console.log(`   ✅ ${name} passed`);
//     } catch (error) {
//       this.results.push({
//         name,
//         passed: false,
//         error: String(error),
//       });
//       console.log(`   ❌ ${name} failed: ${error}`);
//     }
//   }

//   private analyzeTypeAlias(sourceCode: string, typeName: string): TypeNode {
//     const program = ts.createProgram(
//       ["test.ts"],
//       {
//         target: ts.ScriptTarget.ES2022,
//         module: ts.ModuleKind.CommonJS,
//         strictNullChecks: true,
//         strict: true,
//       },
//       {
//         getSourceFile: (fileName) => {
//           if (fileName === "test.ts") {
//             return ts.createSourceFile(
//               fileName,
//               sourceCode,
//               ts.ScriptTarget.ES2022
//             );
//           }
//           return undefined;
//         },
//         writeFile: () => {},
//         getCurrentDirectory: () => "",
//         getDirectories: () => [],
//         fileExists: () => true,
//         readFile: () => "",
//         getCanonicalFileName: (fileName) => fileName,
//         useCaseSensitiveFileNames: () => true,
//         getNewLine: () => "\n",
//       }
//     );

//     const checker = program.getTypeChecker();
//     const sourceFile = program.getSourceFile("test.ts")!;
//     const context = createTypeCreationContext(checker, program, sourceFile, {
//       maxDepth: 10,
//       expanded: true,
//       includeDebugInfo: true,
//     });

//     // 타입 별칭 찾기
//     const typeAlias = sourceFile.statements.find(
//       (stmt): stmt is ts.TypeAliasDeclaration =>
//         ts.isTypeAliasDeclaration(stmt) && stmt.name.text === typeName
//     );

//     if (!typeAlias) {
//       throw new Error(`Type alias '${typeName}' not found`);
//     }

//     const aliasType = checker.getTypeFromTypeNode(typeAlias.type);
//     return this.handler.createTypeNode(aliasType, typeAlias.type, context);
//   }

//   private analyzeMultipleTypes(
//     sourceCode: string,
//     typeNames: string[]
//   ): Array<{ typeName: string; result: TypeNode }> {
//     const program = ts.createProgram(
//       ["test.ts"],
//       {
//         target: ts.ScriptTarget.ES2022,
//         strictNullChecks: true,
//       },
//       {
//         getSourceFile: (fileName) => {
//           if (fileName === "test.ts") {
//             return ts.createSourceFile(
//               fileName,
//               sourceCode,
//               ts.ScriptTarget.ES2022
//             );
//           }
//           return undefined;
//         },
//         writeFile: () => {},
//         getCurrentDirectory: () => "",
//         getDirectories: () => [],
//         fileExists: () => true,
//         readFile: () => "",
//         getCanonicalFileName: (fileName) => fileName,
//         useCaseSensitiveFileNames: () => true,
//         getNewLine: () => "\n",
//       }
//     );

//     const checker = program.getTypeChecker();
//     const sourceFile = program.getSourceFile("test.ts")!;
//     const context = createTypeCreationContext(checker, program, sourceFile);

//     return typeNames.map((typeName) => {
//       const typeAlias = sourceFile.statements.find(
//         (stmt): stmt is ts.TypeAliasDeclaration =>
//           ts.isTypeAliasDeclaration(stmt) && stmt.name.text === typeName
//       );

//       if (!typeAlias) {
//         throw new Error(`Type alias '${typeName}' not found`);
//       }

//       const aliasType = checker.getTypeFromTypeNode(typeAlias.type);
//       const result = this.handler.createTypeNode(
//         aliasType,
//         typeAlias.type,
//         context
//       );

//       return { typeName, result };
//     });
//   }

//   private validateIRStructure(typeNode: TypeNode): {
//     isValid: boolean;
//     errors: string[];
//     details: any;
//   } {
//     const errors: string[] = [];
//     const details: any = {};

//     // 필수 필드 검증
//     if (!typeNode.kind) {
//       errors.push("Missing kind field");
//     }

//     if (typeNode.kind === "conditional" && !typeNode.conditionalInfo) {
//       errors.push("Conditional type missing conditionalInfo");
//     }

//     if (!typeNode.metadata) {
//       errors.push("Missing metadata");
//     } else {
//       details.hasMetadata = true;

//       if (!typeNode.metadata.finalTypeString) {
//         errors.push("Missing finalTypeString in metadata");
//       }

//       if (
//         !typeNode.metadata.educationalSteps ||
//         typeNode.metadata.educationalSteps.length === 0
//       ) {
//         errors.push("Missing or empty educationalSteps");
//       } else {
//         details.educationalStepsCount =
//           typeNode.metadata.educationalSteps.length;
//       }
//     }

//     // 조건부 타입 특화 검증
//     if (typeNode.kind === "conditional" && typeNode.conditionalInfo) {
//       const { checkType, extendsType, trueType, falseType } =
//         typeNode.conditionalInfo;

//       if (!checkType || !extendsType || !trueType || !falseType) {
//         errors.push("Incomplete conditional type components");
//       } else {
//         details.conditionalComponents = {
//           checkType: checkType.kind,
//           extendsType: extendsType.kind,
//           trueType: trueType.kind,
//           falseType: falseType.kind,
//         };
//       }
//     }

//     // Children 검증
//     if (typeNode.children) {
//       details.childrenCount = typeNode.children.length;
//       details.childrenKinds = typeNode.children.map((child) => child.kind);
//     }

//     return {
//       isValid: errors.length === 0,
//       errors,
//       details,
//     };
//   }

//   private analyzeEducationalQuality(steps: any[]): {
//     score: number;
//     details: any;
//   } {
//     let score = 0;
//     const details: any = {};

//     // 단계 수 점수 (0.3)
//     const stepCount = steps.length;
//     details.stepCount = stepCount;
//     if (stepCount >= 4) score += 0.3;
//     else if (stepCount >= 2) score += 0.2;
//     else if (stepCount >= 1) score += 0.1;

//     // 단계 다양성 점수 (0.3)
//     const stepTypes = [...new Set(steps.map((step) => step.type))];
//     details.stepTypes = stepTypes;
//     if (stepTypes.length >= 4) score += 0.3;
//     else if (stepTypes.length >= 3) score += 0.2;
//     else if (stepTypes.length >= 2) score += 0.1;

//     // 세부 정보 품질 점수 (0.4)
//     const stepsWithDetails = steps.filter(
//       (step) => step.details && Object.keys(step.details).length > 0
//     );
//     const detailsRatio = stepsWithDetails.length / stepCount;
//     details.detailsRatio = detailsRatio;
//     if (detailsRatio >= 0.8) score += 0.4;
//     else if (detailsRatio >= 0.6) score += 0.3;
//     else if (detailsRatio >= 0.4) score += 0.2;
//     else if (detailsRatio >= 0.2) score += 0.1;

//     return { score, details };
//   }

//   private printResults(): void {
//     console.log("\n" + "=".repeat(60));
//     console.log("📊 ConditionalTypeHandler Test Results");
//     console.log("=".repeat(60));

//     const passed = this.results.filter((r) => r.passed).length;
//     const failed = this.results.filter((r) => !r.passed).length;
//     const total = this.results.length;
//     const successRate = Math.round((passed / total) * 100);

//     console.log(`\n📈 Summary:`);
//     console.log(`   ✅ Passed: ${passed}`);
//     console.log(`   ❌ Failed: ${failed}`);
//     console.log(`   📊 Total: ${total}`);
//     console.log(`   🎯 Success Rate: ${successRate}%`);

//     if (failed > 0) {
//       console.log(`\n❌ Failed Tests:`);
//       this.results
//         .filter((r) => !r.passed)
//         .forEach((result) => {
//           console.log(`   - ${result.name}: ${result.error}`);
//         });
//     }

//     console.log(`\n✅ Passed Tests:`);
//     this.results
//       .filter((r) => r.passed)
//       .forEach((result) => {
//         console.log(`   - ${result.name}`);
//         if (result.details && typeof result.details === "object") {
//           const details = JSON.stringify(result.details, null, 2)
//             .split("\n")
//             .map((line) => `     ${line}`)
//             .join("\n");
//           console.log(details);
//         }
//       });

//     // Terminal 최적화 통계 출력
//     console.log(`\n⚡ Performance Statistics:`);
//     printTerminalOptimizationStats();

//     console.log(`\n🎉 ConditionalTypeHandler Integration Tests Completed!`);

//     if (successRate >= 90) {
//       console.log(`🌟 Excellent! ConditionalTypeHandler is working perfectly.`);
//     } else if (successRate >= 75) {
//       console.log(
//         `👍 Good! ConditionalTypeHandler is working well with minor issues.`
//       );
//     } else {
//       console.log(
//         `⚠️ ConditionalTypeHandler needs attention - several tests failed.`
//       );
//     }
//   }
// }

// // ==============================
// // 🚀 메인 실행 함수
// // ==============================

// async function main(): Promise<void> {
//   const runner = new ConditionalTypeTestRunner();
//   await runner.runAllTests();
// }

// // 스크립트 직접 실행시
// if (require.main === module) {
//   main().catch((error) => {
//     console.error("❌ Test runner failed:", error);
//     process.exit(1);
//   });
// }

// export { ConditionalTypeTestRunner, main as runConditionalTypeTests };

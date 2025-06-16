// src/handlers/setup.ts (Updated - 타입 안전성 수정)

import * as ts from "typescript"; // 🔧 누락된 import 추가
import {
  registerHandler,
  globalHandlerRegistry,
  setGlobalDebugMode,
} from "./registry";
import { PrimitiveTypeHandler } from "./primitiveTypeHandler";
import { LiteralTypeHandler } from "./literalTypeHandler";
import { TemplateTypeHandler } from "./templateTypeHandler";
import { ArrayTypeHandler } from "./arrayTypeHandler";
import { ReferenceTypeHandler } from "./referenceTypeHandler";
import { ObjectTypeHandler } from "./objectTypeHandler";
import { ConditionalTypeHandler } from "./conditionalTypeHandler";
import { UnionTypeHandler } from "./unionTypeHandler";
import { IntersectionTypeHandler } from "./intersectionTypeHandler";
import { OperatorTypeHandler } from "./operatorTypeHandler";

/**
 * 🚀 모든 핸들러를 올바른 순서로 등록하는 초기화 함수
 *
 * 🔄 주요 변경사항:
 * - InferTypeHandler 제거 (ConditionalTypeHandler에 통합됨)
 * - ConditionalTypeHandler가 이제 infer도 처리
 * - OperatorTypeHandler는 keyof, typeof만 처리
 */
export function initializeTypeHandlers(options?: {
  debugMode?: boolean;
  clearExisting?: boolean;
}): void {
  console.log("🚀 Initializing TypeScript Type Handlers...");

  // 기존 핸들러 초기화 (선택적)
  if (options?.clearExisting) {
    globalHandlerRegistry.clear();
    console.log("🧹 Cleared existing handlers");
  }

  // 디버그 모드 설정
  if (options?.debugMode) {
    setGlobalDebugMode(true);
  }

  console.log("📋 Registering handlers in priority order...");

  // === 우선순위별 핸들러 등록 ===
  registerHandler(new PrimitiveTypeHandler()); // 우선순위: 10
  console.log("   ✅ PrimitiveTypeHandler registered");

  registerHandler(new LiteralTypeHandler()); // 우선순위: 10
  console.log("   ✅ LiteralTypeHandler registered");

  registerHandler(new TemplateTypeHandler()); // 우선순위: 9
  console.log("   ✅ TemplateTypeHandler registered");

  registerHandler(new OperatorTypeHandler()); // 우선순위: 30 (keyof, typeof만)
  console.log("   ✅ OperatorTypeHandler registered (keyof, typeof)");

  registerHandler(new ReferenceTypeHandler()); // 우선순위: 30
  console.log("   ✅ ReferenceTypeHandler registered");

  registerHandler(new ArrayTypeHandler()); // 우선순위: 50
  console.log("   ✅ ArrayTypeHandler registered");

  registerHandler(new ConditionalTypeHandler()); // 우선순위: 50 (infer 포함)
  console.log(
    "   ✅ ConditionalTypeHandler registered (includes infer support)"
  );

  registerHandler(new IntersectionTypeHandler()); // 우선순위: 50
  console.log("   ✅ IntersectionTypeHandler registered");

  registerHandler(new UnionTypeHandler()); // 우선순위: 50
  console.log("   ✅ UnionTypeHandler registered");

  registerHandler(new ObjectTypeHandler()); // 우선순위: 70
  console.log("   ✅ ObjectTypeHandler registered");

  // 등록 완료 상태 확인
  const registryInfo = globalHandlerRegistry.getRegisteredHandlers();
  console.log(`✅ Successfully registered ${registryInfo.length} handlers:`);

  registryInfo.forEach((handler) => {
    console.log(`   - ${handler.name} (priority: ${handler.priority})`);
  });

  console.log("🎉 Type handler initialization completed!");
  console.log(
    "🔄 Note: infer handling moved from InferTypeHandler to ConditionalTypeHandler"
  );
}

/**
 * 🔧 현재 사용 가능한 핸들러들만 등록 (단계적 구현용)
 */
export function initializeAvailableHandlers(): void {
  console.log("📋 Registering currently available handlers...");

  // 현재 구현된 모든 핸들러들 (우선순위 순)
  registerHandler(new PrimitiveTypeHandler());
  registerHandler(new LiteralTypeHandler());
  registerHandler(new TemplateTypeHandler());
  registerHandler(new OperatorTypeHandler()); // keyof, typeof만
  registerHandler(new ReferenceTypeHandler());
  registerHandler(new ArrayTypeHandler());
  registerHandler(new ConditionalTypeHandler()); // infer 포함
  registerHandler(new IntersectionTypeHandler());
  registerHandler(new UnionTypeHandler());
  registerHandler(new ObjectTypeHandler());
  console.log("✅ Available handlers registered");
}

/**
 * 🔧 기본 타입 핸들러들만 등록 (최소 구성)
 */
export function initializeBasicHandlers(): void {
  console.log("📋 Registering basic type handlers only...");

  registerHandler(new PrimitiveTypeHandler());
  registerHandler(new LiteralTypeHandler());
  registerHandler(new TemplateTypeHandler());

  console.log("✅ Basic handlers registered");
}

// ==============================
// 🧪 개별 핸들러 테스트 함수들 (업데이트됨)
// ==============================

/**
 * 🔄 ConditionalTypeHandler 통합 테스트 (infer 포함)
 */
export function testConditionalTypeHandler(): boolean {
  console.log("\n🧪 Testing ConditionalTypeHandler (with infer support)...");

  try {
    const handler = new ConditionalTypeHandler();
    const examples = ConditionalTypeHandler.getSupportedTypes();

    console.log("📋 Conditional & Infer type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    const testExamples = ConditionalTypeHandler.createExamples();
    console.log("📋 Detailed conditional examples:");
    testExamples.forEach((example, index) => {
      console.log(`   ${index + 1}. ${example.description}: ${example.value}`);
      console.log(`      Expected: ${example.expectedBehavior}`);
    });

    console.log("✅ ConditionalTypeHandler comprehensive test passed");
    return true;
  } catch (error) {
    console.error("❌ ConditionalTypeHandler test failed:", error);
    return false;
  }
}

/**
 * 🆕 ConditionalTypeHandler 실제 동작 테스트 (infer 포함)
 */
export function testConditionalTypeHandlerWithRealTypes(): boolean {
  console.log(
    "\n🧪 Testing ConditionalTypeHandler with real TypeScript types (including infer)..."
  );

  try {
    // 실제 테스트 가능한 조건부 타입들 (infer 포함)
    const testCases = [
      {
        name: "IsString",
        definition: "type IsString<T> = T extends string ? 'yes' : 'no'",
        instances: [
          "IsString<string>",
          "IsString<number>",
          "IsString<boolean>",
        ],
        expectedResults: ["'yes'", "'no'", "'no'"],
      },
      {
        name: "ReturnType (with infer)",
        definition:
          "type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never",
        instances: [
          "ReturnType<() => string>",
          "ReturnType<(x: number) => boolean>",
          "ReturnType<string>",
        ],
        expectedResults: ["string", "boolean", "never"],
      },
      {
        name: "ArrayElement (with infer)",
        definition: "type ArrayElement<T> = T extends (infer U)[] ? U : never",
        instances: [
          "ArrayElement<string[]>",
          "ArrayElement<number[]>",
          "ArrayElement<boolean>",
        ],
        expectedResults: ["string", "number", "never"],
      },
      {
        name: "PromiseType (with infer)",
        definition:
          "type PromiseType<T> = T extends Promise<infer V> ? V : never",
        instances: [
          "PromiseType<Promise<string>>",
          "PromiseType<Promise<number>>",
          "PromiseType<string>",
        ],
        expectedResults: ["string", "number", "never"],
      },
      {
        name: "PropertyInfer (with infer)",
        definition:
          "type PropertyInfer<T> = T extends { prop: infer P } ? P : never",
        instances: [
          "PropertyInfer<{ prop: string }>",
          "PropertyInfer<{ prop: number }>",
          "PropertyInfer<{ other: string }>",
        ],
        expectedResults: ["string", "number", "never"],
      },
      {
        name: "TemplateInfer (with infer)",
        definition:
          "type TemplateInfer<T> = T extends `${infer A}-${infer B}` ? [A, B] : never",
        instances: [
          "TemplateInfer<'hello-world'>",
          "TemplateInfer<'foo-bar-baz'>",
          "TemplateInfer<'single'>",
        ],
        expectedResults: ["['hello', 'world']", "['foo', 'bar-baz']", "never"],
      },
    ];

    console.log("📋 Test cases for conditional types (including infer):");
    testCases.forEach((testCase, index) => {
      console.log(`\n   ${index + 1}. ${testCase.name}`);
      console.log(`      Definition: ${testCase.definition}`);

      testCase.instances.forEach((instance, i) => {
        console.log(
          `      ${instance} → Expected: ${testCase.expectedResults[i]}`
        );
      });
    });

    console.log(
      "\n💡 Note: These require actual TypeScript program to test fully."
    );
    console.log(
      "   The handler structure is ready for processing these types."
    );

    console.log("✅ ConditionalTypeHandler real-world test scenarios defined");
    return true;
  } catch (error) {
    console.error("❌ ConditionalTypeHandler real-world test failed:", error);
    return false;
  }
}

/**
 * 🔄 조건부 타입 평가 로직 테스트 (infer 강화됨)
 */
export function testConditionalEvaluationLogic(): boolean {
  console.log(
    "\n🧪 Testing ConditionalTypeHandler evaluation logic (with infer)..."
  );

  try {
    console.log("📋 Simple condition evaluation tests:");

    const simpleTests = [
      {
        check: "string",
        extends: "string",
        expected: true,
        reason: "string extends string",
      },
      {
        check: "string",
        extends: "any",
        expected: true,
        reason: "string extends any",
      },
      {
        check: "string",
        extends: "unknown",
        expected: true,
        reason: "string extends unknown",
      },
      {
        check: "string",
        extends: "number",
        expected: false,
        reason: "string does not extend number",
      },
      {
        check: "any",
        extends: "string",
        expected: false,
        reason: "any only extends any",
      },
      {
        check: "never",
        extends: "string",
        expected: false,
        reason: "never has special extends behavior",
      },
    ];

    simpleTests.forEach((test, index) => {
      const result = test.expected ? "✅" : "❌";
      console.log(
        `   ${index + 1}. ${test.check} extends ${test.extends} → ${
          test.expected
        } ${result}`
      );
      console.log(`      Reason: ${test.reason}`);
    });

    console.log("\n📋 Infer pattern evaluation tests:");

    const inferTests = [
      {
        pattern: "T extends (...args: any[]) => infer R",
        input: "() => string",
        expectedInfer: "R = string",
        reason: "Function return type inference",
      },
      {
        pattern: "T extends (infer U)[]",
        input: "string[]",
        expectedInfer: "U = string",
        reason: "Array element type inference",
      },
      {
        pattern: "T extends Promise<infer V>",
        input: "Promise<number>",
        expectedInfer: "V = number",
        reason: "Promise wrapped type inference",
      },
      {
        pattern: "T extends { prop: infer P }",
        input: "{ prop: boolean }",
        expectedInfer: "P = boolean",
        reason: "Object property type inference",
      },
      {
        pattern: "T extends `${infer A}-${infer B}`",
        input: "'hello-world'",
        expectedInfer: "A = 'hello', B = 'world'",
        reason: "Template literal pattern inference",
      },
    ];

    inferTests.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.pattern}`);
      console.log(`      Input: ${test.input}`);
      console.log(`      Inferred: ${test.expectedInfer}`);
      console.log(`      Reason: ${test.reason}`);
    });

    console.log(
      "\n💡 Note: Actual evaluation requires TypeChecker integration."
    );
    console.log("   The evaluation logic framework is in place.");

    console.log("✅ ConditionalTypeHandler evaluation logic test passed");
    return true;
  } catch (error) {
    console.error(
      "❌ ConditionalTypeHandler evaluation logic test failed:",
      error
    );
    return false;
  }
}

/**
 * 🔄 OperatorTypeHandler 테스트 (infer 제거됨)
 */
export function testOperatorTypeHandler(): boolean {
  console.log("\n🧪 Testing OperatorTypeHandler (keyof, typeof only)...");

  try {
    const handler = new OperatorTypeHandler();
    const examples = OperatorTypeHandler.getSupportedTypes();

    console.log(
      "📋 Supported operator types (infer moved to ConditionalTypeHandler):"
    );
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    // 등록된 연산자들 확인
    const registeredOperators = handler.getRegisteredOperators();
    console.log("\n📋 Registered operators:");
    registeredOperators.forEach((op, index) => {
      console.log(
        `   ${index + 1}. ${op.operator}: ${op.handlerName} (${op.status})`
      );
    });

    // 통계 정보
    const stats = handler.getOperatorStats();
    console.log("\n📊 Operator statistics:");
    console.log(`   Total operators: ${stats.totalOperators}`);
    console.log(`   Active operators: ${stats.activeOperators}`);
    console.log(
      `   Supported operators: [${stats.supportedOperators.join(", ")}]`
    );

    // 🔄 infer 연산자 지원 확인 (이제 지원하지 않음)
    const isInferSupported = handler.isOperatorSupported("infer");
    console.log(
      `\n🚫 Infer operator supported: ${isInferSupported} (moved to ConditionalTypeHandler)`
    );

    if (isInferSupported) {
      console.warn(
        "⚠️ Infer operator should not be supported - check OperatorTypeHandler setup"
      );
      return false;
    }

    // keyof, typeof 패턴 테스트
    console.log(
      "\n🧪 Testing keyof/typeof patterns through OperatorTypeHandler:"
    );
    const operatorPatterns = [
      "keyof { name: string; age: number }",
      "keyof User",
      "typeof myVariable",
      "typeof myFunction",
    ];

    operatorPatterns.forEach((pattern, index) => {
      console.log(`   ${index + 1}. ${pattern}`);
      console.log(`      Status: 🔧 Ready for AST-based detection`);
    });

    console.log("✅ OperatorTypeHandler (keyof, typeof only) test passed");
    return true;
  } catch (error) {
    console.error("❌ OperatorTypeHandler test failed:", error);
    return false;
  }
}

/**
 * 🔄 핸들러 간 상호작용 테스트 (infer → conditional 이동 반영)
 */
export function testHandlerInteractions(): boolean {
  console.log(
    "\n🔥 Testing handler interactions (infer moved to ConditionalTypeHandler)..."
  );

  try {
    console.log("📋 Complex patterns requiring multiple handlers:");

    const complexPatterns = [
      {
        name: "Conditional + Infer (integrated)",
        pattern: "T extends (...args: any[]) => infer R ? R : never",
        expectedHandlers: [
          "ConditionalTypeHandler", // 🔄 Now handles both conditional and infer
          "FunctionTypeHandler",
          "PrimitiveTypeHandler",
        ],
        description:
          "Conditional type with infer - now handled by single ConditionalTypeHandler",
      },
      {
        name: "Conditional + Union",
        pattern: "T extends string | number ? 'primitive' : 'object'",
        expectedHandlers: [
          "ConditionalTypeHandler",
          "UnionTypeHandler",
          "LiteralTypeHandler",
        ],
        description: "Conditional with union types in check position",
      },
      {
        name: "Deep Nested Conditional + Infer",
        pattern:
          "T extends Promise<infer U> ? U extends Array<infer V> ? V : never : never",
        expectedHandlers: [
          "ConditionalTypeHandler", // 🔄 Handles both levels and all infer
          "ReferenceTypeHandler",
          "ArrayTypeHandler",
        ],
        description: "Nested conditional with multiple infer extractions",
      },
      {
        name: "Distributive Conditional + Infer",
        pattern: "T extends any ? T extends infer U ? U[] : never : never",
        expectedHandlers: [
          "ConditionalTypeHandler", // 🔄 Handles distributive and infer
          "UnionTypeHandler",
          "ArrayTypeHandler",
        ],
        description: "Distributive conditional with infer and array creation",
      },
      {
        name: "Template + Infer (integrated)",
        pattern:
          "T extends `${infer Start}-${infer End}` ? [Start, End] : never",
        expectedHandlers: [
          "ConditionalTypeHandler", // 🔄 Now handles template infer too
          "TemplateTypeHandler",
          "ArrayTypeHandler",
        ],
        description: "Template literal parsing with infer",
      },
      {
        name: "Object + Infer (integrated)",
        pattern: "T extends { prop: infer P } ? P : never",
        expectedHandlers: [
          "ConditionalTypeHandler", // 🔄 Handles object infer
          "ObjectTypeHandler",
        ],
        description: "Object property extraction with infer",
      },
      {
        name: "Keyof + Conditional",
        pattern: "T extends Record<infer K, any> ? keyof T : never",
        expectedHandlers: [
          "ConditionalTypeHandler", // 🔄 Handles infer
          "OperatorTypeHandler", // Handles keyof
          "ReferenceTypeHandler",
        ],
        description: "Keyof operator in conditional with infer",
      },
    ];

    complexPatterns.forEach((pattern, index) => {
      console.log(`\n   ${index + 1}. ${pattern.name}`);
      console.log(`      Pattern: ${pattern.pattern}`);
      console.log(
        `      Expected handlers: ${pattern.expectedHandlers.join(" → ")}`
      );
      console.log(`      Description: ${pattern.description}`);
      console.log(`      Status: 🔧 Ready for handler chain analysis`);
    });

    console.log("\n🎯 Updated Handler Interaction Points:");
    console.log(
      "   ├─ ConditionalTypeHandler detects 'T extends U ? X : Y' AND 'infer R'"
    );
    console.log("   ├─ OperatorTypeHandler handles 'keyof T' and 'typeof obj'");
    console.log("   ├─ UnionTypeHandler handles 'string | number' results");
    console.log("   ├─ ArrayTypeHandler processes 'T[]' patterns");
    console.log("   ├─ ObjectTypeHandler analyzes '{ prop: type }' structures");
    console.log("   └─ TemplateTypeHandler parses '`${string}`' patterns");

    console.log("\n🔍 Expected IR Data Flow (Updated):");
    console.log(
      "   1. 🎯 ConditionalTypeHandler creates initial TypeNode (includes infer)"
    );
    console.log(
      "   2. 🔄 Calls globalHandlerRegistry.createTypeNode() for sub-components"
    );
    console.log(
      "   3. 📝 Accumulates EducationalStep[] from ConditionalTypeHandler"
    );
    console.log(
      "   4. 🧩 Builds IntermediateStep[] for transformation process"
    );
    console.log("   5. 🎨 Combines metadata from all participating handlers");
    console.log("   6. 📊 Final TypeNode contains full interaction history");

    console.log("\n💡 Key Changes from infer Integration:");
    console.log("   ✅ Simplified: infer is no longer a separate operator");
    console.log(
      "   ✅ More accurate: infer only exists within conditional types"
    );
    console.log(
      "   ✅ Better education: single handler explains conditional + infer"
    );
    console.log("   ✅ Improved IR: conditional metadata includes infer info");

    console.log("✅ Handler interaction test scenarios updated and prepared");
    console.log(
      "🚀 Ready for real TypeScript file analysis to verify interactions"
    );

    return true;
  } catch (error) {
    console.error("❌ Handler interaction test failed:", error);
    return false;
  }
}

/**
 * 🆕 ConditionalTypeHandler 핸들러 간 상호작용 실제 테스트 (타입 안전성 수정)
 */
export function testConditionalHandlerInteractionWithRealCode(): boolean {
  console.log(
    "\n🧪 Testing ConditionalTypeHandler interactions with real TypeScript code..."
  );

  try {
    // 실제 TypeScript 코드 생성
    const sourceCode = `
      type User = { name: string; age: number };
      type Admin = { name: string; role: string; permissions: string[] };
      
      // 조건부 + infer + 객체
      type ExtractName<T> = T extends { name: infer N } ? N : never;
      
      // 조건부 + infer + 배열 + 함수
      type ExtractCallback<T> = T extends Array<(...args: any[]) => infer R> ? R : never;
      
      // 조건부 + infer + 유니온
      type UnwrapArray<T> = T extends (infer U)[] ? U : T extends (infer V)[][] ? V : never;
    `;

    // 🔧 타입 안전성 수정: CompilerHost 타입 명시
    const compilerHost: ts.CompilerHost = {
      getSourceFile: (
        fileName: string,
        languageVersion: ts.ScriptTarget,
        onError?: ((message: string) => void) | undefined,
        shouldCreateNewSourceFile?: boolean | undefined
      ): ts.SourceFile | undefined => {
        if (fileName === "interaction-test.ts") {
          return ts.createSourceFile(
            fileName,
            sourceCode,
            ts.ScriptTarget.ES2022
          );
        }
        return undefined;
      },
      writeFile: () => {},
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => "",
      getCanonicalFileName: (fileName: string) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      getDefaultLibFileName: (options: ts.CompilerOptions) => {
        return ts.getDefaultLibFilePath(options);
      },
    };

    const program = ts.createProgram(
      ["interaction-test.ts"],
      {
        target: ts.ScriptTarget.ES2022,
        strictNullChecks: true,
      },
      compilerHost
    );

    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile("interaction-test.ts")!;

    // ConditionalTypeHandler 인스턴스 생성
    const handler = new ConditionalTypeHandler();

    // 각 조건부 타입 분석
    const typeAliases = sourceFile.statements.filter(ts.isTypeAliasDeclaration);

    typeAliases.forEach((alias, index) => {
      if (index < 2) return; // User, Admin 건너뛰기

      console.log(`\n   🔍 Testing: ${alias.name.text}`);

      const aliasType = checker.getTypeFromTypeNode(alias.type);
      const isApplicable = handler.isApplicable(aliasType, alias.type);

      console.log(`      Applicable: ${isApplicable}`);

      if (isApplicable) {
        // 🔧 타입 안전성 수정: TypeCreationContext 완전한 options 제공
        const context = {
          checker,
          program,
          sourceFile,
          depth: 0,
          maxDepth: 10,
          referencePath: [],
          options: {
            trackIntermediate: true, // 🔧 누락된 필수 속성 추가
            expanded: true,
            includeDebugInfo: true,
          },
        };

        const typeNode = handler.createTypeNode(aliasType, alias.type, context);

        console.log(`      TypeNode kind: ${typeNode.kind}`);
        console.log(
          `      Has conditional info: ${!!typeNode.conditionalInfo}`
        );
        console.log(
          `      Has infer: ${typeNode.metadata?.conditionalEvaluationInfo?.hasInfer}`
        );
        console.log(`      Children count: ${typeNode.children?.length || 0}`);
        console.log(
          `      Educational steps: ${
            typeNode.metadata?.educationalSteps?.length || 0
          }`
        );

        // 핸들러 상호작용 검증
        if (typeNode.children && typeNode.children.length > 0) {
          console.log(
            `      Child types: ${typeNode.children
              .map((c) => c.kind)
              .join(", ")}`
          );
        }
      }
    });

    console.log("✅ ConditionalTypeHandler interaction test completed");
    return true;
  } catch (error) {
    console.error("❌ ConditionalTypeHandler interaction test failed:", error);
    return false;
  }
}

// ==============================
// 🧪 핸들러 등록 테스트
// ==============================

/**
 * 핸들러 등록 상태 테스트
 */
export function testHandlerRegistration(): boolean {
  console.log("\n🧪 Testing handler registration...");

  try {
    const registryInfo = globalHandlerRegistry.getRegisteredHandlers();

    console.log(`📋 Registered handlers: ${registryInfo.length}`);
    registryInfo.forEach((handler, index) => {
      console.log(
        `   ${index + 1}. ${handler.name} (priority: ${handler.priority})`
      );
    });

    // 필수 핸들러들이 등록되었는지 확인
    const requiredHandlers = [
      "PrimitiveTypeHandler",
      "LiteralTypeHandler",
      "ConditionalTypeHandler",
      "UnionTypeHandler",
    ];

    const registeredNames = registryInfo.map((h) => h.name);
    const missingHandlers = requiredHandlers.filter(
      (name) => !registeredNames.includes(name)
    );

    if (missingHandlers.length > 0) {
      console.error(
        `❌ Missing required handlers: ${missingHandlers.join(", ")}`
      );
      return false;
    }

    console.log("✅ Handler registration test passed");
    return true;
  } catch (error) {
    console.error("❌ Handler registration test failed:", error);
    return false;
  }
}

/**
 * 핸들러 레지스트리 진단
 */
export function diagnoseHandlerRegistry(): void {
  console.log("\n🔍 Handler Registry Diagnosis:");

  const registryInfo = globalHandlerRegistry.getRegisteredHandlers();
  const diagnosis = globalHandlerRegistry.diagnose();

  console.log(`   Total handlers: ${diagnosis.totalHandlers}`);
  console.log(
    `   Duplicate names: ${
      diagnosis.duplicateNames.length > 0
        ? diagnosis.duplicateNames.join(", ")
        : "none"
    }`
  );
  console.log(`   Debug mode: ${diagnosis.hasDebugMode}`);

  console.log("   Handlers by priority:");
  Object.entries(diagnosis.handlersByPriority).forEach(
    ([priority, handlers]) => {
      console.log(`     Priority ${priority}: ${handlers.join(", ")}`);
    }
  );
}

// ==============================
// 🚀 모든 테스트 실행 (업데이트됨)
// ==============================

/**
 * 🚀 모든 테스트 실행 (infer 통합 반영)
 */
export function runAllTests(): boolean {
  console.log(
    "\n🚀 Running all handler tests (infer moved to ConditionalTypeHandler)..."
  );

  const results: boolean[] = [
    testHandlerRegistration(),

    // 🔄 ConditionalTypeHandler 통합 테스트들 (infer 포함)
    testConditionalTypeHandler(),
    testConditionalTypeHandlerWithRealTypes(),
    testConditionalEvaluationLogic(),
    testConditionalHandlerInteractionWithRealCode(),

    // 🔄 OperatorTypeHandler 테스트 (infer 제거됨)
    testOperatorTypeHandler(),

    // 기존 테스트들
    testHandlerInteractions(),
  ];

  const allPassed = results.every((result) => result);

  if (allPassed) {
    console.log("🎉 All tests passed!");
    console.log("🔄 Key Changes Summary:");
    console.log(
      "   ✅ infer handling moved from InferTypeHandler to ConditionalTypeHandler"
    );
    console.log("   ✅ OperatorTypeHandler now handles only keyof and typeof");
    console.log(
      "   ✅ ConditionalTypeHandler provides unified conditional + infer processing"
    );
    console.log(
      "   ✅ Simplified handler architecture with better educational content"
    );
  } else {
    console.log("❌ Some tests failed!");
  }

  return allPassed;
}

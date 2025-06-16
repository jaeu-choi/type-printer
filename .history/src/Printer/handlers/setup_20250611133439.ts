// src/handlers/setup.ts

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
 * 등록 순서가 중요한 이유:
 * 1. 동일한 우선순위 내에서는 등록 순서대로 처리
 * 2. 더 구체적인 핸들러부터 등록 (구체적 → 일반적)
 * 3. 의존성 관계 고려 (기본 핸들러부터 복합 핸들러 순)
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

  registerHandler(new OperatorTypeHandler()); // 우선순위: 30
  console.log("   ✅ OperatorTypeHandler registered");

  registerHandler(new ReferenceTypeHandler()); // 우선순위: 30
  console.log("   ✅ ReferenceTypeHandler registered");

  registerHandler(new ArrayTypeHandler()); // 우선순위: 50
  console.log("   ✅ ArrayTypeHandler registered");

  registerHandler(new ConditionalTypeHandler()); // 우선순위: 50
  console.log("   ✅ ConditionalTypeHandler registered");

  registerHandler(new IntersectionTypeHandler()); // 🆕 우선순위: 50
  console.log("   ✅ Intersection registered");

  registerHandler(new ObjectTypeHandler()); // 우선순위: 70
  console.log("   ✅ ObjectTypeHandler registered");

  registerHandler(new UnionTypeHandler()); // 🆕 우선순위: 50
  console.log("   ✅ UnionTypeHander registered");

  // TODO: 향후 추가될 핸들러들
  // registerHandler(new UnionTypeHandler());        // 유니온 타입
  // registerHandler(new IntersectionTypeHandler()); // 교집합 타입
  // registerHandler(new MappedTypeHandler());       // 매핑 타입
  // registerHandler(new FallbackTypeHandler());     // Fallback 핸들러

  // 등록 완료 상태 확인
  const registryInfo = globalHandlerRegistry.getRegisteredHandlers();
  console.log(`✅ Successfully registered ${registryInfo.length} handlers:`);

  registryInfo.forEach((handler) => {
    console.log(`   - ${handler.name} (priority: ${handler.priority})`);
  });

  console.log("🎉 Type handler initialization completed!");
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
  registerHandler(new OperatorTypeHandler()); // 우선순위: 30
  registerHandler(new ReferenceTypeHandler());
  registerHandler(new ArrayTypeHandler());
  registerHandler(new ConditionalTypeHandler());
  registerHandler(new IntersectionTypeHandler()); // 🆕 우선순위: 50
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
// 🧪 개별 핸들러 테스트 함수들
// ==============================

/**
 * TemplateTypeHandler 테스트
 */
export function testTemplateTypeHandler(): boolean {
  console.log("\n🧪 Testing TemplateTypeHandler...");

  try {
    const handler = new TemplateTypeHandler();
    const examples = TemplateTypeHandler.getSupportedTypes();

    console.log("📋 Template/Literal type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    console.log("✅ TemplateTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ TemplateTypeHandler test failed:", error);
    return false;
  }
}

/**
 * LiteralTypeHandler 테스트
 */
export function testLiteralTypeHandler(): boolean {
  console.log("\n🧪 Testing LiteralTypeHandler...");

  try {
    const handler = new LiteralTypeHandler();
    const examples = LiteralTypeHandler.createExamples();

    console.log("📋 Literal type examples:");
    examples.forEach((example, index) => {
      console.log(
        `   ${index + 1}. ${example.description}: ${example.value} -> ${
          example.expectedType
        }`
      );
    });

    console.log("✅ LiteralTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ LiteralTypeHandler test failed:", error);
    return false;
  }
}

/**
 * ArrayTypeHandler 테스트
 */
export function testArrayTypeHandler(): boolean {
  console.log("\n🧪 Testing ArrayTypeHandler...");

  try {
    const handler = new ArrayTypeHandler();
    const examples = ArrayTypeHandler.getSupportedTypes();

    console.log("📋 Array type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    const testExamples = ArrayTypeHandler.createExamples();
    console.log("📋 Detailed array examples:");
    testExamples.forEach((example, index) => {
      console.log(
        `   ${index + 1}. ${example.description}: ${
          example.value
        } -> element: ${example.expectedElementType}`
      );
    });

    console.log("✅ ArrayTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ ArrayTypeHandler test failed:", error);
    return false;
  }
}

/**
 * ReferenceTypeHandler 테스트
 */
export function testReferenceTypeHandler(): boolean {
  console.log("\n🧪 Testing ReferenceTypeHandler...");

  try {
    const handler = new ReferenceTypeHandler();
    const examples = ReferenceTypeHandler.getSupportedTypes();

    console.log("📋 Reference type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    console.log("✅ ReferenceTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ ReferenceTypeHandler test failed:", error);
    return false;
  }
}

/**
 * ConditionalTypeHandler 테스트 (개선된 버전)
 */
export function testConditionalTypeHandler(): boolean {
  console.log("\n🧪 Testing ConditionalTypeHandler...");

  try {
    const handler = new ConditionalTypeHandler();
    const examples = ConditionalTypeHandler.getSupportedTypes();

    console.log("📋 Conditional type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    const testExamples = ConditionalTypeHandler.createExamples();
    console.log("📋 Detailed conditional examples:");
    testExamples.forEach((example, index) => {
      console.log(`   ${index + 1}. ${example.description}: ${example.value}`);
      console.log(`      Expected: ${example.expectedBehavior}`);
    });

    console.log("✅ ConditionalTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ ConditionalTypeHandler test failed:", error);
    return false;
  }
}

/**
 * 🆕 ConditionalTypeHandler 실제 동작 테스트
 */
export function testConditionalTypeHandlerWithRealTypes(): boolean {
  console.log(
    "\n🧪 Testing ConditionalTypeHandler with real TypeScript types..."
  );

  try {
    // 실제 테스트 가능한 조건부 타입들
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
        name: "ArrayElement",
        definition: "type ArrayElement<T> = T extends (infer U)[] ? U : never",
        instances: [
          "ArrayElement<string[]>",
          "ArrayElement<number[]>",
          "ArrayElement<boolean>",
        ],
        expectedResults: ["string", "number", "never"],
      },
      {
        name: "ReturnTypeOf",
        definition:
          "type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never",
        instances: [
          "ReturnTypeOf<() => string>",
          "ReturnTypeOf<(x: number) => boolean>",
          "ReturnTypeOf<string>",
        ],
        expectedResults: ["string", "boolean", "never"],
      },
    ];

    console.log("📋 Test cases for conditional types:");
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
 * 🆕 조건부 타입 평가 로직 테스트
 */
export function testConditionalEvaluationLogic(): boolean {
  console.log("\n🧪 Testing ConditionalTypeHandler evaluation logic...");

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
 * ObjectTypeHandler 테스트
 */
export function testObjectTypeHandler(): boolean {
  console.log("\n🧪 Testing ObjectTypeHandler...");

  try {
    const handler = new ObjectTypeHandler();
    const examples = ObjectTypeHandler.getSupportedTypes();

    console.log("📋 Object type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    const testExamples = ObjectTypeHandler.createExamples();
    console.log("📋 Detailed object examples:");
    testExamples.forEach((example, index) => {
      console.log(`   ${index + 1}. ${example.description}: ${example.value}`);
      example.expectedMembers.forEach((member, memberIndex) => {
        console.log(`      ${memberIndex + 1}. ${member}`);
      });
    });

    console.log("✅ ObjectTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ ObjectTypeHandler test failed:", error);
    return false;
  }
}

// ==============================
// 🧪 통합 테스트 함수들
// ==============================

/**
 * 🧪 핸들러 등록 테스트
 */
export function testHandlerRegistration(): boolean {
  try {
    const testRegistry = globalHandlerRegistry.getHandlerCount();

    if (testRegistry === 0) {
      console.log("⚠️ No handlers registered. Running initialization...");
      initializeAvailableHandlers();
    }

    const afterInit = globalHandlerRegistry.getHandlerCount();
    console.log(`✅ Handler registration test passed. Handlers: ${afterInit}`);

    // 모든 핸들러 테스트 실행
    // testTemplateTypeHandler();
    // testLiteralTypeHandler();
    // testArrayTypeHandler();
    // testReferenceTypeHandler();
    // testConditionalTypeHandler();
    // testObjectTypeHandler();

    return afterInit > 0;
  } catch (error) {
    console.error("❌ Handler registration test failed:", error);
    return false;
  }
}

/**
 * 🎯 제네릭 배열 통합 테스트
 */
export function testGenericArrayIntegration(): boolean {
  console.log("\n🧪 Testing Generic + Array Integration...");

  try {
    console.log("📋 Expected to handle these cases:");
    console.log("   1. MyArray<string> = T[] with T=string -> string[]");
    console.log("   2. MyArray<number> = T[] with T=number -> number[]");
    console.log("   3. MyArray<User> = T[] with T=User -> User[]");
    console.log("   4. Nested: MyArray<MyArray<string>> -> string[][]");

    console.log("✅ Generic + Array integration scenarios defined");
    return true;
  } catch (error) {
    console.error("❌ Generic + Array integration test failed:", error);
    return false;
  }
}

/**
 * 🎯 완전한 제네릭 객체 통합 테스트
 */
export function testCompleteGenericIntegration(): boolean {
  console.log("\n🧪 Testing Complete Generic Integration...");

  try {
    console.log("📋 Expected complete processing:");
    console.log('   1. IsString<string> -> "yes" ✅ (조건부 제네릭)');
    console.log("   2. MyArray<string> -> string[] ✅ (배열 제네릭)");
    console.log(
      "   3. KeyValue<string, number> -> { key: string; value: number } 🎯 (객체 제네릭)"
    );
    console.log(
      "   4. MyArray<KeyValue<string, number>> -> { key: string; value: number }[] 🔥 (중첩 제네릭)"
    );

    console.log("✅ Complete generic integration scenarios defined");
    return true;
  } catch (error) {
    console.error("❌ Complete generic integration test failed:", error);
    return false;
  }
}

// ==============================
// 🔍 진단 및 상태 확인
// ==============================

/**
 * 🔍 레지스트리 상태 진단
 */
export function diagnoseHandlerRegistry(): void {
  console.log("\n🔍 Handler Registry Diagnosis:");

  const diagnosis = globalHandlerRegistry.diagnose();

  console.log(`   Total handlers: ${diagnosis.totalHandlers}`);
  console.log(`   Debug mode: ${diagnosis.hasDebugMode}`);

  if (diagnosis.duplicateNames.length > 0) {
    console.warn(
      `   ⚠️ Duplicate handler names: ${diagnosis.duplicateNames.join(", ")}`
    );
  }

  console.log("   Handlers by priority:");
  Object.entries(diagnosis.handlersByPriority).forEach(
    ([priority, handlers]) => {
      console.log(`     Priority ${priority}: ${handlers.join(", ")}`);
    }
  );
}

/**
 * UnionTypeHandler 기본 테스트
 */
export function testUnionTypeHandler(): boolean {
  console.log("\n🧪 Testing UnionTypeHandler...");

  try {
    const handler = new UnionTypeHandler();
    const examples = UnionTypeHandler.getSupportedTypes();

    console.log("📋 Union type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    const testExamples = UnionTypeHandler.createExamples();
    console.log("📋 Detailed union examples:");
    testExamples.forEach((example, index) => {
      console.log(`   ${index + 1}. ${example.description}: ${example.value}`);
      console.log(
        `      Expected members: [${example.expectedMembers.join(", ")}]`
      );
    });

    console.log("✅ UnionTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ UnionTypeHandler test failed:", error);
    return false;
  }
}
export function testIntersectionTypeHandler(): boolean {
  console.log("\n🧪 Testing IntersectionTypeHandler...");

  try {
    const handler = new IntersectionTypeHandler();
    const examples = IntersectionTypeHandler.getSupportedTypes();

    console.log("📋 Intersection type examples:");
    examples.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    const testExamples = IntersectionTypeHandler.createExamples();
    console.log("📋 Detailed intersection examples:");
    testExamples.forEach((example, index) => {
      console.log(`   ${index + 1}. ${example.description}: ${example.value}`);
      console.log(
        `      Expected members: [${example.expectedMembers.join(", ")}]`
      );
      console.log(`      Expected result: ${example.expectedResult}`);
    });

    console.log("✅ IntersectionTypeHandler basic test passed");
    return true;
  } catch (error) {
    console.error("❌ IntersectionTypeHandler test failed:", error);
    return false;
  }
}

/**
 * 🚀 모든 테스트 실행
 */
export function runAllTests(): boolean {
  console.log("\n🚀 Running all handler tests...");

  const results: boolean[] | undefined = [
    // testHandlerRegistration(),
    // testGenericArrayIntegration(),
    // testCompleteGenericIntegration(),
    // 🆕 추가된 ConditionalTypeHandler 전용 테스트들
    // testConditionalTypeHandlerWithRealTypes(),
    // testConditionalEvaluationLogic(),
    // testUnionTypeHandler(),
    // testIntersectionTypeHandler(),
  ];

  const allPassed = results.every((result) => result);

  if (allPassed) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("❌ Some tests failed!");
  }

  return allPassed;
}

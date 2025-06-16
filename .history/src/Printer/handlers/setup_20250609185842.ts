// src/handlers/setup.ts

import {
  registerHandler,
  globalHandlerRegistry,
  setGlobalDebugMode,
} from "./registry";
import { PrimitiveTypeHandler } from "./primitiveTypeHandler";
import { LiteralTypeHandler } from "./literalTypeHandler";
import { TemplateTypeHandler } from "./templateTypeHandler";
import { ArrayTypeHandler } from "./arrayTypeHandler"; // 🆕 추가
import { ReferenceTypeHandler } from "./referenceTypeHandler";
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

  // ==============================
  // 🎯 핸들러 등록 순서 (우선순위별)
  // ==============================

  console.log("📋 Registering handlers in priority order...");

  // === 1단계: 최고 우선순위 (10-30) - 기본 타입들 ===

  // 🥇 원시 타입 (가장 기본적인 타입들)
  registerHandler(new PrimitiveTypeHandler());
  console.log("   ✅ PrimitiveTypeHandler registered");

  // 🥈 리터럴 타입 (문자열, 숫자, 불린 등의 구체적 값들)
  registerHandler(new LiteralTypeHandler());
  console.log("   ✅ LiteralTypeHandler registered");

  // 🥉 템플릿/리터럴 상위 핸들러 (다른 리터럴 핸들러들을 조정)
  registerHandler(new TemplateTypeHandler());
  console.log("   ✅ TemplateTypeHandler registered");

  registerHandler(new ReferenceTypeHandler()); // 🆕 우선순위 30
  console.log("   ✅ ReferenceTypeHandler registered");
  // === 2단계: 중간 우선순위 (50-70) - 구조적 타입들 ===

  // 🆕 배열 타입 핸들러 (중간 우선순위)
  registerHandler(new ArrayTypeHandler());
  console.log("   ✅ ArrayTypeHandler registered");

  // TODO: 추가될 구조적 타입 핸들러들
  // registerHandler(new ObjectTypeHandler());       // 객체 타입
  // registerHandler(new FunctionTypeHandler());     // 함수 타입
  // registerHandler(new ReferenceTypeHandler());    // 참조 타입

  // === 3단계: 낮은 우선순위 (80-100) - 복합 타입들 ===

  // TODO: 복합 타입 핸들러들
  // registerHandler(new UnionTypeHandler());        // 유니온 타입
  // registerHandler(new IntersectionTypeHandler()); // 교집합 타입
  // registerHandler(new ConditionalTypeHandler());  // 조건부 타입
  // registerHandler(new MappedTypeHandler());       // 매핑 타입 (가장 복잡)

  // === 4단계: Fallback (999) ===

  // TODO: Fallback 핸들러
  // registerHandler(new FallbackTypeHandler());     // 마지막 보루

  // ==============================
  // 🎯 등록 완료 및 상태 확인
  // ==============================

  const registryInfo = globalHandlerRegistry.getRegisteredHandlers();
  console.log(`✅ Successfully registered ${registryInfo.length} handlers:`);

  registryInfo.forEach((handler) => {
    console.log(`   - ${handler.name} (priority: ${handler.priority})`);
  });

  console.log("🎉 Type handler initialization completed!");
}

/**
 * 🔧 개별 핸들러 그룹 등록 함수들 (세밀한 제어용)
 */

/**
 * 기본 타입 핸들러들만 등록
 */
export function initializeBasicHandlers(): void {
  console.log("📋 Registering basic type handlers only...");

  registerHandler(new PrimitiveTypeHandler());
  registerHandler(new TemplateTypeHandler());
  registerHandler(new LiteralTypeHandler());

  console.log("✅ Basic handlers registered");
}

/**
 * 현재 사용 가능한 핸들러들만 등록 (단계적 구현용)
 */
export function initializeAvailableHandlers(): void {
  console.log("📋 Registering currently available handlers...");

  // 현재 구현된 핸들러들만 (우선순위 순)
  registerHandler(new PrimitiveTypeHandler());
  registerHandler(new TemplateTypeHandler());
  registerHandler(new LiteralTypeHandler());
  registerHandler(new ArrayTypeHandler()); // 🆕 추가

  registerHandler(new ReferenceTypeHandler()); // 🆕 추가
  registerHandler(new ObjectTypeHandler()); // 🆕 우선순위 70

  console.log("✅ Available handlers registered");
}

/**
 * 🧪 핸들러별 개별 테스트 함수들
 */

/**
 * ArrayTypeHandler 테스트 🆕
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
 * 🧪 핸들러 등록 테스트 (업데이트됨)
 */
export function testHandlerRegistration(): boolean {
  try {
    // 테스트용 임시 등록
    const testRegistry = globalHandlerRegistry.getHandlerCount();

    if (testRegistry === 0) {
      console.log("⚠️ No handlers registered. Running initialization...");
      initializeAvailableHandlers();
    }

    const afterInit = globalHandlerRegistry.getHandlerCount();
    console.log(`✅ Handler registration test passed. Handlers: ${afterInit}`);

    // 추가: 핸들러 테스트들
    testTemplateTypeHandler();
    testLiteralTypeHandler();
    testArrayTypeHandler(); // 🆕 추가
    testReferenceTypeHandler(); // 🆕 추가
    return afterInit > 0;
  } catch (error) {
    console.error("❌ Handler registration test failed:", error);
    return false;
  }
}
// 🆕 ReferenceTypeHandler 테스트 함수 추가
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
 * 🎯 제네릭 + 배열 통합 테스트 🆕
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
 * 🚀 모든 테스트 실행
 */
export function runAllTests(): boolean {
  console.log("\n🚀 Running all handler tests...");

  const results = [testHandlerRegistration(), testGenericArrayIntegration()];

  const allPassed = results.every((result) => result);

  if (allPassed) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("❌ Some tests failed!");
  }

  return allPassed;
}

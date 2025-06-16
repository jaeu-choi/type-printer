// src/handlers/setup.ts

import {
  registerHandler,
  globalHandlerRegistry,
  setGlobalDebugMode,
} from "./registry";
import { PrimitiveTypeHandler } from "./primitiveTypeHandler";

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

  // TODO: 나중에 추가될 핸들러들
  // registerHandler(new LiteralTypeHandler());      // 리터럴 타입
  // registerHandler(new StringLiteralHandler());    // 문자열 리터럴
  // registerHandler(new NumberLiteralHandler());    // 숫자 리터럴
  // registerHandler(new BooleanLiteralHandler());   // 불린 리터럴

  // === 2단계: 중간 우선순위 (50-70) - 구조적 타입들 ===

  // TODO: 구조적 타입 핸들러들
  // registerHandler(new ArrayTypeHandler());        // 배열 타입
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
  // TODO: Literal 핸들러들도 여기에

  console.log("✅ Basic handlers registered");
}

/**
 * 현재 사용 가능한 핸들러들만 등록 (단계적 구현용)
 */
export function initializeAvailableHandlers(): void {
  console.log("📋 Registering currently available handlers...");

  // 현재 구현된 핸들러들만
  registerHandler(new PrimitiveTypeHandler());

  console.log("✅ Available handlers registered");
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
 * 🧪 핸들러 등록 테스트
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

    return afterInit > 0;
  } catch (error) {
    console.error("❌ Handler registration test failed:", error);
    return false;
  }
}

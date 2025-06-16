// src/handlers/typeNodeHelper.ts의 편의 함수들 부분 수정

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 간단한 자식 노드 생성
 */
export function createChild(
  type: ts.Type,
  node: ts.TypeNode | undefined,
  context: TypeCreationContext,
  typeName?: string
): TypeNode {
  return TypeNodeHelper.createChildTypeNode(type, node, context, { typeName });
}

/**
 * 안전한 배치 처리 - 🔧 수정됨
 */
export function createChildrenSafe(
  items: Array<{ type: ts.Type; node?: ts.TypeNode }>,
  context: TypeCreationContext
): TypeNode[] {
  // 🔧 수정: createChildTypeNodes는 TypeNode[]를 직접 반환하므로 .results 제거
  return TypeNodeHelper.createChildTypeNodes(
    items.map((item, index) => ({ ...item, name: `child_${index}` })),
    context,
    { filterInvalid: true }
  );
}

// src/handlers/typeNodeHelper.ts의 편의 함수들 부분 수정

// ==============================
// 🎯 편의 함수들
// ==============================

/**
 * 간단한 자식 노드 생성
 */
export function createChild(
  type: ts.Type,
  node: ts.TypeNode | undefined,
  context: TypeCreationContext,
  typeName?: string
): TypeNode {
  return TypeNodeHelper.createChildTypeNode(type, node, context, { typeName });
}

/**
 * 안전한 배치 처리 - 🔧 수정됨
 */
export function createChildrenSafe(
  items: Array<{ type: ts.Type; node?: ts.TypeNode }>,
  context: TypeCreationContext
): TypeNode[] {
  // 🔧 수정: createChildTypeNodes는 TypeNode[]를 직접 반환하므로 .results 제거
  return TypeNodeHelper.createChildTypeNodes(
    items.map((item, index) => ({ ...item, name: `child_${index}` })),
    context,
    { filterInvalid: true }
  );
}

/**
 * 안전한 배치 처리 (상세 결과 포함) - 🆕 추가
 */
export function createChildrenSafeWithStats(
  items: Array<{ type: ts.Type; node?: ts.TypeNode }>,
  context: TypeCreationContext
): {
  results: TypeNode[];
  errors: Array<{ index: number; name?: string; error: string }>;
  stats: { total: number; successful: number; failed: number };
} {
  // 🔧 createTypeNodeBatch를 사용하면 객체 형태로 반환됨
  return TypeNodeHelper.createTypeNodeBatch(
    items.map((item, index) => ({
      ...item,
      name: `child_${index}`,
      required: false,
    })),
    context,
    {
      enableLogging: false,
      stopOnFirstError: false,
      collectErrors: true,
    }
  );
}

/**
 * 순환 참조 안전 생성
 */
export function createWithCircularCheck<T>(
  typeName: string,
  context: TypeCreationContext,
  operation: (ctx: TypeCreationContext) => T,
  fallback: T
): T {
  return TypeNodeHelper.withCircularReferenceCheck(
    typeName,
    context,
    operation,
    () => fallback
  );
}
/**
 * 안전한 배치 처리 (상세 결과 포함) - 🆕 추가
 */
export function createChildrenSafeWithStats(
  items: Array<{ type: ts.Type; node?: ts.TypeNode }>,
  context: TypeCreationContext
): {
  results: TypeNode[];
  errors: Array<{ index: number; name?: string; error: string }>;
  stats: { total: number; successful: number; failed: number };
} {
  // 🔧 createTypeNodeBatch를 사용하면 객체 형태로 반환됨
  return TypeNodeHelper.createTypeNodeBatch(
    items.map((item, index) => ({
      ...item,
      name: `child_${index}`,
      required: false,
    })),
    context,
    {
      enableLogging: false,
      stopOnFirstError: false,
      collectErrors: true,
    }
  );
}

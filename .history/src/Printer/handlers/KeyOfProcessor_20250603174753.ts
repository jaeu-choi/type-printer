// mappedType.ts의 extractMappedProcess 메서드 수정:

private extractMappedProcess(
  mappedNode: ts.MappedTypeNode,
  context: TypeCollectionContext
): TypeStructure[] {
  const components: TypeStructure[] = [];

  // 🚨 깊이 제한 체크
  if (context.depth >= context.maxDepth - 2) {
    console.log(`🚨 MappedType depth limit reached`);
    return [
      {
        type: "literal",
        value: "...(depth limited)",
        metadata: { depthLimited: true },
      }
    ];
  }

  // 안전한 컨텍스트 생성
  const safeContext = {
    ...context,
    depth: context.depth + 1,
  };

  try {
    // 1. 타입 매개변수 (P)
    const typeParameter = mappedNode.typeParameter;
    components.push({
      type: "reference",
      name: "[TypeParameter]",
      children: [this.extractTypeParameter(typeParameter, safeContext)],
      metadata: {
        originalText: typeParameter.getText(),
        description: "Mapped type parameter",
        parameterName: typeParameter.name.text,
      },
    });

    // 2. In 절 (K) - 매핑할 키들 (🚨 안전하게 처리)
    if (typeParameter.constraint) {
      try {
        const constraintStructure = this.collector.collect(typeParameter.constraint, safeContext);
        components.push({
          type: "reference",
          name: "[InType]",
          children: [constraintStructure],
          metadata: {
            originalText: typeParameter.constraint.getText(),
            description: "Keys to iterate over (in clause)",
          },
        });
      } catch (error) {
        console.log(`⚠️ MappedType constraint analysis failed: ${error.message}`);
        components.push({
          type: "reference",
          name: "[InType]",
          children: [{
            type: "literal",
            value: typeParameter.constraint.getText(),
            metadata: { originalText: typeParameter.constraint.getText() },
          }],
          metadata: {
            originalText: typeParameter.constraint.getText(),
            description: "Keys to iterate over (fallback)",
          },
        });
      }
    }

    // 3. 값 타입 (T) - 각 속성의 타입 (🚨 안전하게 처리)
    if (mappedNode.type) {
      try {
        const valueStructure = this.collector.collect(mappedNode.type, safeContext);
        components.push({
          type: "reference",
          name: "[ValueType]",
          children: [valueStructure],
          metadata: {
            originalText: mappedNode.type.getText(),
            description: "Type of each mapped property",
          },
        });
      } catch (error) {
        console.log(`⚠️ MappedType value type analysis failed: ${error.message}`);
        components.push({
          type: "reference",
          name: "[ValueType]",
          children: [{
            type: "literal",
            value: mappedNode.type.getText(),
            metadata: { originalText: mappedNode.type.getText() },
          }],
          metadata: {
            originalText: mappedNode.type.getText(),
            description: "Type of each mapped property (fallback)",
          },
        });
      }
    }

    // 나머지 구성 요소들은 기존 로직 유지...
    const modifiers = this.extractModifiers(mappedNode);
    if (modifiers.length > 0) {
      components.push({
        type: "reference",
        name: "[Modifiers]",
        children: modifiers,
        metadata: {
          description: "Property modifiers (readonly, optional)",
        },
      });
    }

    if (mappedNode.nameType) {
      try {
        const nameTypeStructure = this.collector.collect(mappedNode.nameType, safeContext);
        components.push({
          type: "reference",
          name: "[KeyRemapping]",
          children: [nameTypeStructure],
          metadata: {
            originalText: mappedNode.nameType.getText(),
            description: "Key remapping (as clause)",
          },
        });
      } catch (error) {
        console.log(`⚠️ MappedType name type analysis failed: ${error.message}`);
      }
    }

    return components;
  } catch (error) {
    console.log(`🚨 MappedType process failed: ${error.message}`);
    return [
      {
        type: "literal",
        value: mappedNode.getText(),
        metadata: { 
          originalText: mappedNode.getText(),
          processingFailed: true 
        },
      }
    ];
  }
}
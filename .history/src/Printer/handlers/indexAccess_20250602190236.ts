formatter.ts
454줄

ts


printer.ts
321줄

ts


types.ts
85줄

ts


intersectionType.ts
427줄

ts


referenceType.ts
563줄

ts


fallback.ts
16줄

ts


indexAccess.ts
462줄

ts


operatorType.ts
211줄

ts


primitiveType.ts
50줄

ts


objectLiteral.ts
494줄

ts


unionType.ts
581줄

ts


index.ts
48줄

ts


arrayType.ts
169줄

ts


conditionalType.ts
333줄

ts

type some = {
  name: string;
  age: number;
};
type someValue = some["age"];

인덱스접근타입에서의 값 someValue 의 예측값은 number임
그런데 실제는
Kind: TYPEALIAS
✓ computedResult 사용
=== formatObject 프로퍼티 처리: toString, 타입: primitive ===
✓ toString을 기본 타입으로 처리 (primitive)
=== formatObject 프로퍼티 처리: toFixed, 타입: primitive ===
✓ toFixed을 기본 타입으로 처리 (primitive)
=== formatObject 프로퍼티 처리: toExponential, 타입: primitive ===
✓ toExponential을 기본 타입으로 처리 (primitive)
=== formatObject 프로퍼티 처리: toPrecision, 타입: primitive ===
✓ toPrecision을 기본 타입으로 처리 (primitive)
=== formatObject 프로퍼티 처리: valueOf, 타입: primitive ===
✓ valueOf을 기본 타입으로 처리 (primitive)
=== formatObject 프로퍼티 처리: toLocaleString, 타입: primitive ===
✓ toLocaleString을 기본 타입으로 처리 (primitive)
==================================================
|            [Original]               |
|type someValue = some["age"];
==================================================
someValue:
{
|---toString: (radix?: number) => string;
|---toFixed: (fractionDigits?: number) => string;
|---toExponential: (fractionDigits?: number) => string;
|---toPrecision: (precision?: number) => string;
|---valueOf: () => number;
|---toLocaleString: { (locales?: string | string[], options?: NumberFormatOptions): string; (locales?: LocalesArgument, options?: NumberFormatOptions): string; };
}
==================================================
이건 아마, 빌트인 number 오브젝트같은데?

편집
네, 맞습니다! 현재 코드가 number 타입의 빌트인 메서드들을 가져오고 있는 것 같습니다. some["age"]는 단순히 number 타입이어야 하는데, TypeScript의 number 타입에 포함된 모든 프로토타입 메서드들이 표시되고 있네요.

문제는 IndexAccessHandler의 computeFinalIndexAccessResult 메서드에서 finalType.getProperties()를 호출할 때 원시 타입인 경우에도 빌트인 프로토타입 프로퍼티들을 가져오고 있기 때문입니다.


Fixed IndexAccess Handler
코드 
주요 수정사항:

🔥 핵심 문제 해결
원시 타입 우선 체크: computeFinalIndexAccessResult에서 isPrimitiveType() 체크를 가장 먼저 수행
빌트인 메서드 필터링: hasOnlyBuiltinMethods() 메서드로 toString, valueOf 같은 빌트인 프로토타입 메서드들을 필터링
사용자 정의 객체 타입 판별: isUserDefinedObjectType() 메서드로 실제 사용자가 정의한 객체 타입만 객체로 처리
🎯 타입 판별 로직 개선
typescript
// ✨ 원시 타입 (number, string, boolean 등) 먼저 체크
if (this.isPrimitiveType(finalType)) {
  return { type: "primitive", value: finalTypeString };
}

// ✨ 빌트인 메서드만 있는 타입은 객체로 처리하지 않음
private hasOnlyBuiltinMethods(properties: ts.Symbol[]): boolean {
  const builtinMethods = new Set([
    'toString', 'valueOf', 'toLocaleString',
    'toFixed', 'toExponential', 'toPrecision', // number methods
    // ...
  ]);
  return properties.every(prop => builtinMethods.has(prop.name));
}
이제 some["age"]는 올바르게 number 타입으로 표시될 것입니다!

typescript
// 예상 결과:
someValue: number
TypeScript의 타입 시스템에서 number 타입은 내부적으로 Number 프로토타입의 모든 메서드를 포함하고 있지만, 실제 사용자가 기대하는 것은 단순히 number라는 원시 타입이죠.




지금  indexAccess핸들러전체파일을 좀 보고 있는데 이거 왜이렇게 기능이 많은것 같지? 코드생성하지말고, 이게 이렇게 기능이 많아야지 되나?

편집
네, 맞습니다! IndexAccessHandler가 너무 복잡하고 기능이 과도하게 많아 보이네요.

🤔 IndexAccess의 본질적 역할
IndexAccess 타입 (T["key"])의 핵심은:

입력: 객체 타입 T와 키 "key"
출력: 해당 키의 타입 (예: number, string 등)
즉, 타입을 "추출"하는 단순한 연산이어야 합니다.

🚨 현재 코드의 문제점들
과도한 책임:
명목적 과정 추출
참조 추적
객체 구조 분석
배열/Union/Intersection 처리
사용자 정의 타입 확장
중복된 로직:
다른 핸들러들(ObjectLiteralHandler, ReferenceHandler 등)과 유사한 타입 판별/처리 로직을 중복 구현
복잡한 휴리스틱:
isUserDefinedObjectType(), hasOnlyBuiltinMethods() 같은 복잡한 판별 로직
💡 단순화 방향
IndexAccess는 다음만 해야 할 것 같습니다:

typescript
// 핵심 로직만
1. TypeChecker로 최종 타입 계산: `checker.getTypeFromTypeNode()`
2. 결과가 primitive면 → primitive로 반환
3. 결과가 복잡하면 → 다른 적절한 핸들러에게 위임
복잡한 타입 분석은 각각의 전용 핸들러들이 담당해야 하고, IndexAccess는 단순히 "키로 타입 추출" 역할만 하는 게 맞는 것 같습니다.

현재 코드가 500줄이 넘는데, 실제로는 50-100줄 정도로도 충분할 것 같아요. 어떻게 생각하시나요?




다른 핸들러에게 위임하는것은 포기했음 현재에서는 다른 핸들러들도 자체적으로 처리하는 중 아니니? 코드생성하지말고

편집
아, 맞네요! 다른 핸들러들도 다 자체적으로 처리하고 있죠.

🔍 현재 구조의 특징
각 핸들러가 **자립적(self-contained)**으로 설계되어 있어서:

UnionTypeHandler → Union 타입의 모든 케이스를 자체 처리
IntersectionTypeHandler → Intersection의 모든 병합 로직을 자체 처리
ReferenceTypeHandler → 참조 타입의 모든 확장 로직을 자체 처리
그래서 IndexAccessHandler도 IndexAccess의 결과로 나올 수 있는 모든 케이스를 자체적으로 처리하려고 하는 거군요.

🤷‍♂️ 그럼 이 복잡성이 불가피한가?
IndexAccess의 결과는 정말 다양할 수 있어서:

User["name"] → string (primitive)
User["address"] → { city: string; ... } (object)
User["tags"] → string[] (array)
Config["mode"] → "dev" | "prod" (union)
등등...
각 핸들러가 위임 없이 자체 처리하는 현재 아키텍처에서는 IndexAccess도 이 모든 케이스를 다 알고 있어야 하는 게 맞는 것 같네요.

그렇다면 현재의 복잡성은 어느 정도 필연적이고, 오히려 타입 판별 로직의 정확성이 더 중요한 포인트인 것 같습니다.




거의 모든 경우는 잘 작동하는거같은데
키가 유니온일떄도 작동해야하는거 아니냐?  에를들어,

type some = {
  name: string;
  age: number;
  address: { city: string; zipNum: number };
  email: "age" | "number";
};
type someValue = some["email" | "age"];
printer.printType("someValue");

편집
아, 맞습니다! 인덱스 키가 Union일 때도 처리해야 하죠.

some["email" | "age"]는 some["email"] | some["age"]가 되어야 하는데, 현재 코드를 보면:

🔍 현재 코드의 문제점
extractOriginalTypeInfo 메서드에서:

typescript
if (!ts.isLiteralTypeNode(indexNode.indexType)) {
  return []; // 🚨 여기서 바로 빈 배열 반환!
}
Union 인덱스 ("email" | "age")는 LiteralTypeNode가 아니라 UnionTypeNode이기 때문에 처리되지 않고 있네요.

🎯 필요한 처리
Union 인덱스 감지: ts.isUnionTypeNode(indexNode.indexType) 체크
각 Union 멤버별로 타입 추출:
"email" → "age" | "number"
"age" → number
결과를 Union으로 결합: ("age" | "number") | number
현재는 TypeChecker가 최종 결과(finalType)는 올바르게 계산해주지만, 명목적 과정에서 원본 AST 추적 부분이 Union 인덱스를 처리하지 못하고 있는 상황인 것 같습니다.

extractOriginalTypeInfo와 관련 메서드들에서 Union 인덱스 케이스를 추가로 처리해야 할 것 같네요.




그 부분만 생성하면될까?

편집
네! extractOriginalTypeInfo 메서드에서 Union 인덱스 케이스만 추가하면 될 것 같습니다.


Union Index Support for extractOriginalTypeInfo
코드 
이 수정으로 some["email" | "age"] 같은 Union 인덱스가 처리됩니다:

Union 감지: ts.isUnionTypeNode(indexNode.indexType) 체크
각 멤버 처리: "email"과 "age" 각각에 대해 타입 추출
결과 병합: 모든 결과를 하나의 배열로 합침
명목적 과정에서 Union 인덱스의 참조 추적이 올바르게 표시될 것입니다!




Kind: TYPEALIAS
UnionTypeHandler: finalTypeString = "number" | "age"
Union 타입 멤버 수: 2
타입요소 0: "number"
타입요소 1: "age"
UnionTypeHandler: finalTypeString = "email" | "age"
Union 타입 멤버 수: 2
타입요소 0: "email"
타입요소 1: "age"
✓ Union 인덱스 감지: "email" | "age"
  - Union 멤버 "email" 처리 중...
    → 2개 결과 추출
  - Union 멤버 "age" 처리 중...
    → 1개 결과 추출
✓ Union 인덱스 총 3개 결과 반환
=== computeFinalIndexAccessResult ===
finalTypeString: someValue
finalType.flags: 1048576
✓ Union 타입으로 처리
✓ computedResult 사용
==================================================
|            [Original]               |
|type someValue = some["email" | "age"];
==================================================
someValue:
someValue
==================================================

편집
보니까 몇 가지 문제가 있네요:

🔍 문제 분석
finalTypeString이 "someValue": 타입 별칭 이름이 나오고 있음 → 실제 계산된 타입이 아님
Union 처리 후 someValue만 출력: computedResult가 제대로 계산되지 않음
TypeFlags가 1048576: 이게 어떤 플래그인지 확인 필요
🎯 예상되는 원인
IndexAccessHandler의 computeFinalIndexAccessResult에서 Union 타입을 감지했지만, 실제 Union 멤버들을 올바르게 처리하지 못하고 있는 것 같습니다.

🤔 디버깅 포인트들
finalType.isUnion()이 true인가?
Union 타입으로 감지되었으니 true일 것
finalType.types에는 뭐가 들어있나?
("age" | "number") | number 의 실제 타입들
createFinalMemberStructure에서 각 멤버를 어떻게 처리하고 있나?
각 Union 멤버가 올바르게 분석되고 있는지
현재 로그를 보면 Union 인덱스 추출은 성공했는데, 최종 결과 계산에서 문제가 있는 것 같습니다. computeFinalIndexAccessResult의 Union 처리 부분에서 더 자세한 디버깅이 필요할 것 같아요.




디버깅을 위한 코드 전체를 생성해줘

편집

Debug Version of IndexAccess Handler
코드 
이 디버깅 버전은 모든 중요한 단계에서 상세한 로그를 출력합니다:

🔍 주요 디버깅 포인트
TypeChecker 결과 분석:
`






import * as ts from "typescript";
import {
  TypeHandler,
  TypeStructure,
  TypeCollectionContext,
  ObjectProperty,
} from "../types";
import { TypeStructureCollector } from "./index";

export class IndexAccessHandler implements TypeHandler {
  canHandle(node: ts.TypeNode): boolean {
    return ts.isIndexedAccessTypeNode(node);
  }

  handle(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    const indexNode = node as ts.IndexedAccessTypeNode;

    console.log("=== IndexAccessHandler.handle 시작 ===");
    console.log("indexNode.getText():", indexNode.getText());
    console.log("objectType:", indexNode.objectType.getText());
    console.log("indexType:", indexNode.indexType.getText());

    // 최종 계산된 타입 가져오기 (TypeScript 컴파일러가 계산한 결과)
    const finalType = context.checker.getTypeFromTypeNode(indexNode);
    const finalTypeString = context.checker.typeToString(finalType);

    console.log("=== TypeChecker 결과 ===");
    console.log("finalTypeString:", finalTypeString);
    console.log("finalType.flags:", finalType.flags);
    console.log("finalType.isUnion():", finalType.isUnion());
    if (finalType.isUnion()) {
      console.log("Union types count:", finalType.types.length);
      finalType.types.forEach((t, i) => {
        console.log(`  Union[${i}]:`, context.checker.typeToString(t), "flags:", t.flags);
      });
    }

    // 명목적 과정: 원본 AST에서 참조 추적 정보 추출
    const nominalProcess = this.extractNominalProcess(indexNode, context);

    // 최종 결과 계산
    const computedResult = this.computeFinalIndexAccessResult(
      finalType,
      context,
      indexNode
    );

    console.log("=== computedResult 생성 완료 ===");
    console.log("computedResult.type:", computedResult.type);
    console.log("computedResult.value:", computedResult.value);
    console.log("computedResult.children?.length:", computedResult.children?.length);

    const structure: TypeStructure = {
      type: "access",
      metadata: {
        originalText: indexNode.getText(),
        finalTypeString,
      },
    };

    if (context.expanded) {
      // expanded 모드: 명목적 과정 + 최종 결과 모두 표시
      structure.children = nominalProcess;
      structure.computedResult = computedResult;
    } else {
      // 기본 모드: 최종 결과만 표시
      structure.computedResult = computedResult;
    }

    console.log("=== IndexAccessHandler.handle 완료 ===");
    return structure;
  }

  private extractNominalProcess(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): TypeStructure[] {
    console.log("=== extractNominalProcess 시작 ===");
    const process: TypeStructure[] = [];

    // 1. 객체 타입 참조 정보
    const objectTypeStructure = new TypeStructureCollector().collect(
      indexNode.objectType,
      context
    );
    process.push({
      type: "reference",
      name: "[ObjectType]",
      children: [objectTypeStructure],
      metadata: { originalText: indexNode.objectType.getText() },
    });

    // 2. 인덱스 타입 정보
    const indexTypeStructure = new TypeStructureCollector().collect(
      indexNode.indexType,
      context
    );
    process.push({
      type: "reference",
      name: "[IndexType]",
      children: [indexTypeStructure],
      metadata: { originalText: indexNode.indexType.getText() },
    });

    // 3. 원본 타입 정보 (AST에서 추출한 참조 추적)
    const originalTypeInfo = this.extractOriginalTypeInfo(indexNode, context);
    console.log("originalTypeInfo.length:", originalTypeInfo.length);
    
    if (originalTypeInfo.length > 0) {
      const referenceTrace = originalTypeInfo.map((info, index) => ({
        type: "reference" as const,
        name: info.typeName
          ? `[Reference: ${info.typeName}]`
          : `[Member ${index}]`,
        metadata: {
          originalText: info.typeNode?.getText() || "",
          originalTypeName: info.typeName,
        },
      }));

      process.push({
        type: "reference",
        name: "[ReferenceTrace]",
        children: referenceTrace,
        metadata: { originalText: "Reference tracking from AST" },
      });
    }

    console.log("=== extractNominalProcess 완료, process.length:", process.length, "===");
    return process;
  }

  private computeFinalIndexAccessResult(
    finalType: ts.Type,
    context: TypeCollectionContext,
    indexNode: ts.IndexedAccessTypeNode
  ): TypeStructure {
    const finalTypeString = context.checker.typeToString(finalType);

    console.log("=== computeFinalIndexAccessResult 시작 ===");
    console.log("finalTypeString:", finalTypeString);
    console.log("finalType.flags:", finalType.flags);
    console.log("finalType.isUnion():", finalType.isUnion());

    // ✨ CRITICAL FIX: 원시 타입 먼저 체크!
    if (this.isPrimitiveType(finalType)) {
      console.log("✓ Primitive 타입으로 처리:", finalTypeString);
      return {
        type: "primitive",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
    }

    // ✨ CRITICAL FIX: 리터럴 타입 체크
    if (this.isLiteralType(finalType)) {
      console.log("✓ Literal 타입으로 처리:", finalTypeString);
      return {
        type: "literal",
        value: finalTypeString,
        metadata: { finalTypeString },
      };
    }

    // Union 타입인 경우 (예: User["age"] = number | Client)
    if (finalType.isUnion()) {
      console.log("✓ Union 타입으로 처리");
      console.log("Union members count:", finalType.types.length);
      
      const finalMembers = finalType.types.map((memberType, index) => {
        console.log(`=== Union Member ${index} 처리 시작 ===`);
        const memberString = context.checker.typeToString(memberType);
        console.log(`Member ${index} typeString:`, memberString);
        console.log(`Member ${index} flags:`, memberType.flags);
        
        const memberResult = this.createFinalMemberStructure(memberType, context);
        
        console.log(`Member ${index} result type:`, memberResult.type);
        console.log(`Member ${index} result value:`, memberResult.value);
        console.log(`=== Union Member ${index} 처리 완료 ===`);
        
        return memberResult;
      });

      console.log("✓ Union 처리 완료, finalMembers.length:", finalMembers.length);
      
      const unionResult = {
        type: "union" as const,
        children: finalMembers,
        metadata: {
          finalTypeString,
          originalText: indexNode.getText(),
        },
      };
      
      console.log("=== Union 결과 생성 완료 ===");
      return unionResult;
    }

    // 배열 타입인 경우
    if (this.isArrayType(finalType, finalTypeString)) {
      console.log("✓ Array 타입으로 처리");
      return this.createArrayStructure(finalType, finalTypeString, context);
    }

    // 실제 사용자 정의 객체 타입인 경우에만 프로퍼티 수집
    if (this.isUserDefinedObjectType(finalType, context)) {
      console.log("✓ 사용자 정의 객체 타입으로 처리");
      const properties = this.collectFinalProperties(finalType, context);
      return {
        type: "object",
        properties,
        metadata: { finalTypeString },
      };
    }

    // 참조 타입인 경우
    if (this.isReferenceType(finalType)) {
      console.log("✓ Reference 타입으로 처리");
      return this.createReferenceStructure(finalType, finalTypeString, context);
    }

    // 기본 fallback
    console.log("✓ Fallback to primitive");
    return {
      type: "primitive",
      value: finalTypeString,
      metadata: { finalTypeString },
    };
  }

  private createFinalMemberStructure(
    memberType: ts.Type,
    context: TypeCollectionContext
  ): TypeStructure {
    const memberTypeString = context.checker.typeToString(memberType);
    
    console.log("--- createFinalMemberStructure ---");
    console.log("memberTypeString:", memberTypeString);
    console.log("memberType.flags:", memberType.flags);

    // 원시 타입 먼저 체크!
    if (this.isPrimitiveType(memberType)) {
      console.log("→ 원시 타입으로 처리");
      return {
        type: "primitive",
        value: memberTypeString,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // 리터럴 타입 체크
    if (this.isLiteralType(memberType)) {
      console.log("→ 리터럴 타입으로 처리");
      return {
        type: "literal",
        value: memberTypeString,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // Union 타입인 경우 (중첩 Union)
    if (memberType.isUnion()) {
      console.log("→ 중첩 Union 타입으로 처리");
      const nestedMembers = memberType.types.map((nestedType, i) => {
        console.log(`  Nested Union[${i}]:`, context.checker.typeToString(nestedType));
        return this.createFinalMemberStructure(nestedType, context);
      });
      
      return {
        type: "union",
        children: nestedMembers,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // 객체 타입인 경우 (사용자 정의만)
    if (this.isUserDefinedObjectType(memberType, context)) {
      console.log("→ 사용자 정의 객체 타입으로 처리");
      const properties = this.collectFinalProperties(memberType, context);
      return {
        type: "object",
        properties,
        metadata: { finalTypeString: memberTypeString },
      };
    }

    // 사용자 정의 타입 참조인 경우 (심볼이 있는 경우)
    if (this.isReferenceType(memberType)) {
      console.log("→ 참조 타입으로 처리");
      return this.createReferenceStructure(memberType, memberTypeString, context);
    }

    // 기본 처리
    console.log("→ 기본 primitive 처리");
    return {
      type: "primitive",
      value: memberTypeString,
      metadata: { finalTypeString: memberTypeString },
    };
  }

  // ✨ NEW: 타입 판별 메서드들
  private isPrimitiveType(type: ts.Type): boolean {
    const result = !!(
      type.flags &
      (ts.TypeFlags.String |
        ts.TypeFlags.Number |
        ts.TypeFlags.Boolean |
        ts.TypeFlags.BigInt |
        ts.TypeFlags.ESSymbol |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Any |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined)
    );
    console.log(`isPrimitiveType: ${result} (flags: ${type.flags})`);
    return result;
  }

  private isLiteralType(type: ts.Type): boolean {
    const result = !!(
      type.flags &
      (ts.TypeFlags.StringLiteral |
        ts.TypeFlags.NumberLiteral |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.BigIntLiteral |
        ts.TypeFlags.TemplateLiteral |
        ts.TypeFlags.EnumLiteral)
    );
    console.log(`isLiteralType: ${result} (flags: ${type.flags})`);
    return result;
  }

  private isArrayType(type: ts.Type, typeString: string): boolean {
    const result = (
      typeString.endsWith("[]") ||
      (type.symbol && type.symbol.name === "Array") ||
      typeString.startsWith("Array<")
    );
    console.log(`isArrayType: ${result} (typeString: ${typeString})`);
    return result;
  }

  private isUserDefinedObjectType(type: ts.Type, context: TypeCollectionContext): boolean {
    // 원시 타입이나 리터럴 타입이면 제외
    if (this.isPrimitiveType(type) || this.isLiteralType(type)) {
      console.log("isUserDefinedObjectType: false (primitive/literal)");
      return false;
    }

    // 배열 타입이면 제외
    const typeString = context.checker.typeToString(type);
    if (this.isArrayType(type, typeString)) {
      console.log("isUserDefinedObjectType: false (array)");
      return false;
    }

    // 프로퍼티가 있는지 확인
    const properties = type.getProperties();
    if (!properties || properties.length === 0) {
      console.log("isUserDefinedObjectType: false (no properties)");
      return false;
    }

    // ✨ CRITICAL: 빌트인 타입의 프로토타입 메서드들 제외
    if (this.hasOnlyBuiltinMethods(properties)) {
      console.log("isUserDefinedObjectType: false (builtin methods only)");
      return false;
    }

    // 프로퍼티가 너무 많으면 제외 (복잡한 빌트인 타입일 가능성)
    if (properties.length > 50) {
      console.log("isUserDefinedObjectType: false (too many properties)");
      return false;
    }

    console.log("isUserDefinedObjectType: true");
    return true;
  }

  private hasOnlyBuiltinMethods(properties: ts.Symbol[]): boolean {
    // 일반적인 빌트인 메서드 이름들
    const builtinMethods = new Set([
      'toString', 'valueOf', 'toLocaleString',
      'toFixed', 'toExponential', 'toPrecision', // number methods
      'charAt', 'charCodeAt', 'concat', 'indexOf', 'slice', 'substring', // string methods
      'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable' // Object methods
    ]);

    const result = properties.every(prop => builtinMethods.has(prop.name));
    console.log(`hasOnlyBuiltinMethods: ${result} (properties: ${properties.map(p => p.name).join(', ')})`);
    return result;
  }

  private isReferenceType(type: ts.Type): boolean {
    const result = !!(
      type.symbol &&
      type.symbol.declarations &&
      type.symbol.declarations.length > 0 &&
      type.symbol.flags &
        (ts.SymbolFlags.Type | ts.SymbolFlags.Interface | ts.SymbolFlags.Class)
    );
    console.log(`isReferenceType: ${result}`);
    return result;
  }

  private createArrayStructure(
    type: ts.Type,
    typeString: string,
    context: TypeCollectionContext
  ): TypeStructure {
    console.log("--- createArrayStructure ---");
    const typeArgs = context.checker.getTypeArguments(type as ts.TypeReference);

    if (typeArgs && typeArgs.length > 0) {
      const elementType = typeArgs[0];
      const elementStructure = this.createFinalMemberStructure(elementType, context);

      return {
        type: "array",
        children: [elementStructure],
        metadata: { finalTypeString: typeString },
      };
    }

    return {
      type: "array",
      metadata: { finalTypeString: typeString },
    };
  }

  private createReferenceStructure(
    type: ts.Type,
    typeString: string,
    context: TypeCollectionContext
  ): TypeStructure {
    console.log("--- createReferenceStructure ---");
    const declaration = type.symbol?.declarations?.[0];
    let typeName = "Unknown";

    if (declaration) {
      if (ts.isTypeAliasDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isInterfaceDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      } else if (ts.isClassDeclaration(declaration) && declaration.name) {
        typeName = declaration.name.text;
      }
    }

    console.log("typeName:", typeName);

    // 내장 타입 체크
    if (this.isBuiltinType(typeName)) {
      console.log("→ 빌트인 타입으로 처리");
      return {
        type: "reference",
        name: typeName,
        metadata: {
          isBuiltin: true,
          finalTypeString: typeString,
        },
      };
    }

    // 참조 타입이 실제로 사용자 정의 객체 구조를 가지는지 확인
    if (this.isUserDefinedObjectType(type, context)) {
      console.log("→ 사용자 정의 객체로 확장");
      return {
        type: "object",
        properties: this.collectFinalProperties(type, context),
        metadata: { finalTypeString: typeString },
      };
    }

    // 단순 참조 타입
    const structure: TypeStructure = {
      type: "reference",
      name: `[${typeName}]`,
      metadata: {
        isBuiltin: false,
        finalTypeString: typeString,
        originalTypeName: typeName,
      },
    };

    // 컨텍스트에 따라 확장 여부 결정
    if (context.expanded && this.shouldExpandReference(context)) {
      const expanded = this.expandTypeDeclaration(declaration!, typeName, context);
      if (expanded) {
        structure.children = [expanded];
      }
    }

    return structure;
  }

  private collectFinalProperties(
    objectType: ts.Type,
    context: TypeCollectionContext
  ): ObjectProperty[] {
    console.log("--- collectFinalProperties ---");
    const properties: ObjectProperty[] = [];

    try {
      const props = objectType.getProperties();
      console.log("Properties count:", props.length);

      for (const prop of props) {
        const propType = context.checker.getTypeOfSymbolAtLocation(
          prop,
          prop.valueDeclaration || prop.declarations?.[0]!
        );
        const propTypeString = context.checker.typeToString(propType);

        const optional = !!(prop.flags & ts.SymbolFlags.Optional);
        let readonly = false;

        if (
          prop.valueDeclaration &&
          ts.isPropertySignature(prop.valueDeclaration)
        ) {
          readonly = !!prop.valueDeclaration.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          );
        }

        console.log(`Property: ${prop.name} → ${propTypeString}`);

        properties.push({
          name: prop.name,
          type: {
            type: "primitive",
            value: propTypeString,
            metadata: { finalTypeString: propTypeString },
          },
          optional,
          readonly,
        });
      }
    } catch (error) {
      console.log("Debug - Error collecting final properties:", error);
    }

    console.log("Final properties count:", properties.length);
    return properties;
  }

  // Union 인덱스 지원을 위한 수정된 extractOriginalTypeInfo
  private extractOriginalTypeInfo(
    indexNode: ts.IndexedAccessTypeNode,
    context: TypeCollectionContext
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log("=== extractOriginalTypeInfo 시작 ===");
    try {
      if (!ts.isTypeReferenceNode(indexNode.objectType)) {
        console.log("objectType이 TypeReferenceNode가 아님");
        return [];
      }

      const objectTypeName = indexNode.objectType.typeName.getText();
      console.log("objectTypeName:", objectTypeName);
      
      const typeDeclaration = this.findTypeDeclarationInProgram(
        objectTypeName,
        context
      );
      if (!typeDeclaration) {
        console.log("typeDeclaration을 찾을 수 없음");
        return [];
      }

      // ✨ NEW: Union 인덱스 타입 처리
      if (ts.isUnionTypeNode(indexNode.indexType)) {
        console.log("✓ Union 인덱스 감지:", indexNode.indexType.getText());
        
        const allResults: Array<{ typeName?: string; typeNode?: ts.TypeNode }> = [];
        
        // 각 Union 멤버별로 타입 추출
        for (const unionMember of indexNode.indexType.types) {
          if (ts.isLiteralTypeNode(unionMember)) {
            const propertyName = unionMember.literal.getText().replace(/['"]/g, "");
            console.log(`  - Union 멤버 "${propertyName}" 처리 중...`);
            
            let memberResults: Array<{ typeName?: string; typeNode?: ts.TypeNode }> = [];
            
            if (ts.isInterfaceDeclaration(typeDeclaration)) {
              memberResults = this.extractFromInterface(typeDeclaration, propertyName);
            } else if (
              ts.isTypeAliasDeclaration(typeDeclaration) &&
              ts.isTypeLiteralNode(typeDeclaration.type)
            ) {
              memberResults = this.extractFromTypeLiteral(typeDeclaration.type, propertyName);
            }
            
            console.log(`    → ${memberResults.length}개 결과 추출`);
            allResults.push(...memberResults);
          }
        }
        
        console.log(`✓ Union 인덱스 총 ${allResults.length}개 결과 반환`);
        return allResults;
      }

      // 기존 단일 리터럴 처리
      if (!ts.isLiteralTypeNode(indexNode.indexType)) {
        console.log("indexType이 LiteralTypeNode가 아님");
        return [];
      }

      const propertyName = indexNode.indexType.literal
        .getText()
        .replace(/['"]/g, "");
      console.log("propertyName:", propertyName);

      if (ts.isInterfaceDeclaration(typeDeclaration)) {
        return this.extractFromInterface(typeDeclaration, propertyName);
      } else if (
        ts.isTypeAliasDeclaration(typeDeclaration) &&
        ts.isTypeLiteralNode(typeDeclaration.type)
      ) {
        return this.extractFromTypeLiteral(typeDeclaration.type, propertyName);
      }

      return [];
    } catch (error) {
      console.log("Debug - Error extracting original type info:", error);
      return [];
    }
  }

  private extractFromInterface(
    interfaceDecl: ts.InterfaceDeclaration,
    propertyName: string
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log(`extractFromInterface: ${propertyName}`);
    for (const member of interfaceDecl.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const memberName = member.name.getText().replace(/['"]/g, "");
        if (memberName === propertyName && member.type) {
          console.log(`찾음: ${memberName} → ${member.type.getText()}`);
          return this.extractTypeInfoFromTypeNode(member.type);
        }
      }
    }
    console.log(`찾지 못함: ${propertyName}`);
    return [];
  }

  private extractFromTypeLiteral(
    typeLiteral: ts.TypeLiteralNode,
    propertyName: string
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log(`extractFromTypeLiteral: ${propertyName}`);
    for (const member of typeLiteral.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const memberName = member.name.getText().replace(/['"]/g, "");
        if (memberName === propertyName && member.type) {
          console.log(`찾음: ${memberName} → ${member.type.getText()}`);
          return this.extractTypeInfoFromTypeNode(member.type);
        }
      }
    }
    console.log(`찾지 못함: ${propertyName}`);
    return [];
  }

  private extractTypeInfoFromTypeNode(
    typeNode: ts.TypeNode
  ): Array<{ typeName?: string; typeNode?: ts.TypeNode }> {
    console.log(`extractTypeInfoFromTypeNode: ${typeNode.getText()}`);
    if (ts.isUnionTypeNode(typeNode)) {
      console.log("Union 타입 노드 처리");
      return typeNode.types.map((unionMember, i) => {
        console.log(`  Union[${i}]: ${unionMember.getText()}`);
        if (ts.isTypeReferenceNode(unionMember)) {
          return {
            typeName: unionMember.typeName.getText(),
            typeNode: unionMember,
          };
        }
        return { typeNode: unionMember };
      });
    } else if (ts.isTypeReferenceNode(typeNode)) {
      console.log("Reference 타입 노드 처리");
      return [
        {
          typeName: typeNode.typeName.getText(),
          typeNode: typeNode,
        },
      ];
    } else {
      console.log("기타 타입 노드 처리");
      return [{ typeNode: typeNode }];
    }
  }

  private findTypeDeclarationInProgram(
    typeName: string,
    context: TypeCollectionContext
  ): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | null {
    const sourceFiles = context.program.getSourceFiles();
    for (const sourceFile of sourceFiles) {
      for (const statement of sourceFile.statements) {
        if (
          (ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement)) &&
          statement.name?.text === typeName
        ) {
          return statement;
        }
      }
    }
    return null;
  }

  private isBuiltinType(name: string): boolean {
    const builtinTypes = [
      "Array",
      "Promise",
      "Record",
      "Pick",
      "Omit",
      "Partial",
      "Required",
      "Readonly",
      "NonNullable",
      "ReturnType",
      "Parameters",
      "ConstructorParameters",
      "InstanceType",
      "ThisParameterType",
      "OmitThisParameter",
      "ThisType",
      "Uppercase",
      "Lowercase",
      "Capitalize",
      "Uncapitalize",
      "Extract",
      "Exclude",
    ];
    return builtinTypes.includes(name);
  }

  private shouldExpandReference(context: TypeCollectionContext): boolean {
    return context.depth < context.maxDepth;
  }

  private expandTypeDeclaration(
    declaration: ts.Declaration,
    typeName: string,
    context: TypeCollectionContext
  ): TypeStructure | null {
    const newContext = {
      ...context,
      depth: context.depth + 1,
      referencePath: [...context.referencePath, typeName],
    };

    if (ts.isTypeAliasDeclaration(declaration)) {
      return new TypeStructureCollector().collect(declaration.type, newContext);
    }

    if (ts.isInterfaceDeclaration(declaration)) {
      return this.collectInterfaceStructure(declaration, newContext);
    }

    return null;
  }

  private collectInterfaceStructure(
    node: ts.InterfaceDeclaration,
    context: TypeCollectionContext
  ): TypeStructure {
    const properties: ObjectProperty[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = member.name.getText();
        const optional = !!member.questionToken;
        const readonly =
          member.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          ) || false;

        const propType = member.type
          ? new TypeStructureCollector().collect(member.type, context)
          : { type: "primitive" as const, value: "any" };

        properties.push({
          name: propName,
          type: propType,
          optional,
          readonly,
        });
      }
    }

    return {
      type: "object",
      properties,
      metadata: { originalText: node.getText() },
    };
  }
}
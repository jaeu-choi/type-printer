// tests/conditionalTypeHandler.test.ts

import * as ts from "typescript";
import { ConditionalTypeHandler } from "../src/handlers/conditionalTypeHandler";
import {
  createTypeCreationContext,
  TypeCreationContext,
  TypeNode,
} from "../src/ir";
import {
  globalHandlerRegistry,
  registerHandler,
  setGlobalDebugMode,
} from "../src/handlers/registry";
import { initializeAvailableHandlers } from "../src/handlers/setup";

/**
 * 🧪 ConditionalTypeHandler 통합 테스트
 *
 * 테스트 범위:
 * 1. 기본 조건부 타입 (T extends string ? "yes" : "no")
 * 2. infer 포함 조건부 타입 (T extends (...args: any[]) => infer R ? R : never)
 * 3. 복합 infer 패턴 (T extends Promise<infer U> ? U : never)
 * 4. 핸들러 간 상호작용 확인
 * 5. IR 구조 검증
 * 6. 교육적 단계 검증
 */

describe("ConditionalTypeHandler", () => {
  let handler: ConditionalTypeHandler;
  let program: ts.Program;
  let checker: ts.TypeChecker;
  let sourceFile: ts.SourceFile;
  let context: TypeCreationContext;

  beforeAll(() => {
    // 핸들러 시스템 초기화
    setGlobalDebugMode(true);
    initializeAvailableHandlers();

    handler = new ConditionalTypeHandler();
    console.log("🚀 ConditionalTypeHandler tests initialized");
  });

  beforeEach(() => {
    // 각 테스트용 TypeScript 프로그램 생성
    const sourceCode = `
      // 기본 조건부 타입들
      type IsString<T> = T extends string ? "yes" : "no";
      type IsNumber<T> = T extends number ? true : false;
      
      // infer를 포함한 조건부 타입들
      type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
      type ArrayElement<T> = T extends (infer U)[] ? U : never;
      type PromiseType<T> = T extends Promise<infer V> ? V : never;
      type PropertyType<T> = T extends { prop: infer P } ? P : never;
      type TemplateInfer<T> = T extends \`\${infer A}-\${infer B}\` ? [A, B] : never;
      
      // 복합 조건부 타입들
      type DeepArray<T> = T extends (infer U)[][] ? U : never;
      type FunctionChain<T> = T extends (arg: infer A) => (result: infer B) => any ? [A, B] : never;
      
      // 분산 조건부 타입들
      type Distributive<T> = T extends any ? T[] : never;
      
      // 테스트 타입들
      type User = { name: string; age: number };
      type Admin = { name: string; role: string };
    `;

    program = ts.createProgram(
      ["test.ts"],
      {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        strictNullChecks: true,
        strict: true,
      },
      {
        getSourceFile: (fileName) => {
          if (fileName === "test.ts") {
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
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
      }
    );

    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile("test.ts")!;
    context = createTypeCreationContext(checker, program, sourceFile, {
      maxDepth: 10,
      expanded: true,
      includeDebugInfo: true,
    });
  });

  /**
   * 🧪 테스트 1: 기본 조건부 타입 처리
   */
  describe("Basic Conditional Types", () => {
    test("should handle basic conditional type - IsString<T>", () => {
      console.log("\n🧪 Testing basic conditional type: IsString<T>");

      const typeAlias = findTypeAlias("IsString");
      expect(typeAlias).toBeDefined();

      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const isApplicable = handler.isApplicable(aliasType, typeAlias!.type);

      console.log(`🔍 IsApplicable: ${isApplicable}`);
      expect(isApplicable).toBe(true);

      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      // IR 구조 검증
      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.conditionalInfo).toBeDefined();
      expect(typeNode.conditionalInfo!.checkType).toBeDefined();
      expect(typeNode.conditionalInfo!.extendsType).toBeDefined();
      expect(typeNode.conditionalInfo!.trueType).toBeDefined();
      expect(typeNode.conditionalInfo!.falseType).toBeDefined();

      // 메타데이터 검증
      expect(typeNode.metadata?.finalTypeString).toBeDefined();
      expect(typeNode.metadata?.educationalSteps).toBeDefined();
      expect(typeNode.metadata?.conditionalEvaluationInfo).toBeDefined();

      console.log(`✅ TypeNode kind: ${typeNode.kind}`);
      console.log(
        `✅ Final type string: ${typeNode.metadata?.finalTypeString}`
      );
      console.log(
        `✅ Educational steps: ${
          typeNode.metadata?.educationalSteps?.length || 0
        }`
      );

      // 교육적 단계 검증
      const educationalSteps = typeNode.metadata?.educationalSteps || [];
      expect(educationalSteps.length).toBeGreaterThan(0);

      const detectionStep = educationalSteps.find(
        (step) => step.type === "generic-detection"
      );
      expect(detectionStep).toBeDefined();
      expect(detectionStep?.details?.pattern).toBe("conditional");
    });

    test("should handle boolean result conditional type - IsNumber<T>", () => {
      console.log("\n🧪 Testing boolean conditional type: IsNumber<T>");

      const typeAlias = findTypeAlias("IsNumber");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.metadata?.conditionalEvaluationInfo?.hasInfer).toBe(
        false
      );

      console.log(`✅ Boolean conditional type processed`);
    });
  });

  /**
   * 🧪 테스트 2: infer 포함 조건부 타입 처리
   */
  describe("Conditional Types with Infer", () => {
    test("should handle function return type inference - ReturnType<T>", () => {
      console.log("\n🧪 Testing infer in function: ReturnType<T>");

      const typeAlias = findTypeAlias("ReturnType");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      // IR 구조 검증
      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.metadata?.conditionalEvaluationInfo?.hasInfer).toBe(true);
      expect(
        typeNode.metadata?.conditionalEvaluationInfo?.complexityLevel
      ).toBe("moderate");

      // infer 변수 검증
      const inferInfo = typeNode.metadata?.inferInfo;
      expect(inferInfo).toBeDefined();

      console.log(
        `✅ Infer detected: ${typeNode.metadata?.conditionalEvaluationInfo?.hasInfer}`
      );
      console.log(
        `✅ Complexity level: ${typeNode.metadata?.conditionalEvaluationInfo?.complexityLevel}`
      );

      // 교육적 단계에서 infer 추출 과정 확인
      const educationalSteps = typeNode.metadata?.educationalSteps || [];
      const inferStep = educationalSteps.find((step) => step.type === "custom");
      expect(inferStep).toBeDefined();
      expect(inferStep?.description).toContain("inferred type variables");

      console.log(`✅ Infer educational step found: ${inferStep?.description}`);
    });

    test("should handle array element inference - ArrayElement<T>", () => {
      console.log("\n🧪 Testing array element infer: ArrayElement<T>");

      const typeAlias = findTypeAlias("ArrayElement");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.metadata?.conditionalEvaluationInfo?.hasInfer).toBe(true);

      // infer 변수가 배열 패턴에서 추출되었는지 확인
      const educationalSteps = typeNode.metadata?.educationalSteps || [];
      const inferStep = educationalSteps.find((step) => step.type === "custom");
      expect(inferStep?.details?.extractionProcess).toBe("pattern matching");

      console.log(`✅ Array element infer processed`);
    });

    test("should handle Promise unwrapping - PromiseType<T>", () => {
      console.log("\n🧪 Testing Promise infer: PromiseType<T>");

      const typeAlias = findTypeAlias("PromiseType");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.metadata?.conditionalEvaluationInfo?.hasInfer).toBe(true);

      console.log(`✅ Promise infer processed`);
    });

    test("should handle object property inference - PropertyType<T>", () => {
      console.log("\n🧪 Testing object property infer: PropertyType<T>");

      const typeAlias = findTypeAlias("PropertyType");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.metadata?.conditionalEvaluationInfo?.hasInfer).toBe(true);

      console.log(`✅ Object property infer processed`);
    });

    test("should handle template literal inference - TemplateInfer<T>", () => {
      console.log("\n🧪 Testing template literal infer: TemplateInfer<T>");

      const typeAlias = findTypeAlias("TemplateInfer");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.metadata?.conditionalEvaluationInfo?.hasInfer).toBe(true);
      expect(
        typeNode.metadata?.conditionalEvaluationInfo?.complexityLevel
      ).toBe("complex");

      console.log(`✅ Template literal infer processed`);
    });
  });

  /**
   * 🧪 테스트 3: 핸들러 간 상호작용 확인
   */
  describe("Handler Interactions", () => {
    test("should properly delegate to other handlers for conditional components", () => {
      console.log("\n🧪 Testing handler interactions");

      const typeAlias = findTypeAlias("ReturnType");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);

      // Mock globalHandlerRegistry to track calls
      const originalCreateTypeNode = globalHandlerRegistry.createTypeNode;
      const handlerCalls: Array<{ kind: string; handlerUsed?: string }> = [];

      globalHandlerRegistry.createTypeNode = function (type, node, context) {
        const result = originalCreateTypeNode.call(this, type, node, context);
        handlerCalls.push({
          kind: result.kind,
          handlerUsed: result.metadata?.handlerUsed,
        });
        return result;
      };

      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      // Restore original function
      globalHandlerRegistry.createTypeNode = originalCreateTypeNode;

      // 조건부 타입의 구성 요소들이 다른 핸들러들에 의해 처리되었는지 확인
      expect(handlerCalls.length).toBeGreaterThan(4); // checkType, extendsType, trueType, falseType

      console.log(`🔗 Handler calls made: ${handlerCalls.length}`);
      handlerCalls.forEach((call, index) => {
        console.log(
          `   ${index + 1}. ${call.kind} (handler: ${
            call.handlerUsed || "unknown"
          })`
        );
      });

      // 다양한 타입 종류가 처리되었는지 확인
      const processedKinds = handlerCalls.map((call) => call.kind);
      expect(processedKinds).toContain("primitive"); // never, any 등
      // expect(processedKinds).toContain("reference"); // function type 등

      console.log(`✅ Handler interactions verified`);
    });

    test("should handle complex object types in conditional branches", () => {
      console.log("\n🧪 Testing object type handling in conditionals");

      // 복합 객체 타입을 포함한 조건부 타입 생성
      const complexSource = `
        type ComplexConditional<T> = T extends { name: string } 
          ? { result: T; success: true } 
          : { error: string; success: false };
      `;

      const complexProgram = ts.createProgram(
        ["complex.ts"],
        {
          target: ts.ScriptTarget.ES2022,
          strictNullChecks: true,
        },
        {
          getSourceFile: (fileName) => {
            if (fileName === "complex.ts") {
              return ts.createSourceFile(
                fileName,
                complexSource,
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
          getCanonicalFileName: (fileName) => fileName,
          useCaseSensitiveFileNames: () => true,
          getNewLine: () => "\n",
        }
      );

      const complexChecker = complexProgram.getTypeChecker();
      const complexSourceFile = complexProgram.getSourceFile("complex.ts")!;
      const complexContext = createTypeCreationContext(
        complexChecker,
        complexProgram,
        complexSourceFile
      );

      const complexTypeAlias = complexSourceFile
        .statements[0] as ts.TypeAliasDeclaration;
      const complexAliasType = complexChecker.getTypeFromTypeNode(
        complexTypeAlias.type
      );

      const typeNode = handler.createTypeNode(
        complexAliasType,
        complexTypeAlias.type,
        complexContext
      );

      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.conditionalInfo).toBeDefined();

      // true/false 브랜치가 객체 타입으로 처리되었는지 확인
      const trueType = typeNode.conditionalInfo!.trueType;
      const falseType = typeNode.conditionalInfo!.falseType;

      // 객체 타입이거나 참조 타입이어야 함
      expect(["object", "reference"].includes(trueType.kind)).toBe(true);
      expect(["object", "reference"].includes(falseType.kind)).toBe(true);

      console.log(`✅ Complex object conditionals handled`);
      console.log(`   True branch: ${trueType.kind}`);
      console.log(`   False branch: ${falseType.kind}`);
    });
  });

  /**
   * 🧪 테스트 4: IR 구조 상세 검증
   */
  describe("IR Structure Validation", () => {
    test("should generate complete IR structure with all required fields", () => {
      console.log("\n🧪 Testing complete IR structure");

      const typeAlias = findTypeAlias("ReturnType");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      // 필수 필드들 검증
      expect(typeNode.kind).toBe("conditional");
      expect(typeNode.conditionalInfo).toBeDefined();
      expect(typeNode.children).toBeDefined();
      expect(typeNode.children?.length).toBe(4); // checkType, extendsType, trueType, falseType
      expect(typeNode.metadata).toBeDefined();

      // ConditionalTypeInfo 구조 검증
      const conditionalInfo = typeNode.conditionalInfo!;
      expect(conditionalInfo.checkType).toBeDefined();
      expect(conditionalInfo.extendsType).toBeDefined();
      expect(conditionalInfo.trueType).toBeDefined();
      expect(conditionalInfo.falseType).toBeDefined();

      // 메타데이터 구조 검증
      const metadata = typeNode.metadata!;
      expect(metadata.originalText).toBeDefined();
      expect(metadata.finalTypeString).toBeDefined();
      expect(metadata.analysisMethod).toBe("type-checker");
      expect(metadata.educationalSteps).toBeDefined();
      expect(metadata.conditionalEvaluationInfo).toBeDefined();

      // ConditionalEvaluationInfo 검증
      const evalInfo = metadata.conditionalEvaluationInfo!;
      expect(evalInfo.condition).toBeDefined();
      expect(evalInfo.evaluationMethod).toBeDefined();
      expect(evalInfo.hasInfer).toBe(true);
      expect(evalInfo.complexityLevel).toBeDefined();

      console.log(`✅ Complete IR structure verified`);
      console.log(`   Children count: ${typeNode.children?.length}`);
      console.log(`   Educational steps: ${metadata.educationalSteps?.length}`);
      console.log(`   Complexity level: ${evalInfo.complexityLevel}`);
    });

    test("should include intermediate steps for complex conditionals", () => {
      console.log("\n🧪 Testing intermediate steps generation");

      const typeAlias = findTypeAlias("TemplateInfer"); // 복합 타입
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      expect(typeNode.metadata?.intermediateSteps).toBeDefined();
      expect(typeNode.metadata?.intermediateSteps?.length).toBeGreaterThan(0);

      const intermediateSteps = typeNode.metadata?.intermediateSteps || [];

      // 중간 단계들의 구조 검증
      intermediateSteps.forEach((step, index) => {
        expect(step.stepType).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.input).toBeDefined();
        expect(step.output).toBeDefined();
        expect(step.transformation).toBeDefined();

        console.log(
          `   Step ${index + 1}: ${step.stepType} - ${step.description}`
        );
      });

      console.log(
        `✅ Intermediate steps verified: ${intermediateSteps.length} steps`
      );
    });
  });

  /**
   * 🧪 테스트 5: 교육적 단계 검증
   */
  describe("Educational Steps Validation", () => {
    test("should generate comprehensive educational steps for learning", () => {
      console.log("\n🧪 Testing educational steps comprehensiveness");

      const typeAlias = findTypeAlias("ReturnType");
      const aliasType = checker.getTypeFromTypeNode(typeAlias!.type);
      const typeNode = handler.createTypeNode(
        aliasType,
        typeAlias!.type,
        context
      );

      const educationalSteps = typeNode.metadata?.educationalSteps || [];
      expect(educationalSteps.length).toBeGreaterThanOrEqual(4); // 최소 4단계

      // 필수 교육적 단계들 확인
      const stepTypes = educationalSteps.map((step) => step.type);
      expect(stepTypes).toContain("generic-detection");
      expect(stepTypes).toContain("definition-lookup");
      expect(stepTypes).toContain("parameter-mapping");
      expect(stepTypes).toContain("instantiation-start");

      // 각 단계의 상세 정보 검증
      educationalSteps.forEach((step, index) => {
        expect(step.type).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.details).toBeDefined();

        console.log(
          `   📚 Step ${index + 1}: [${step.type}] ${step.description}`
        );

        if (step.details && typeof step.details === "object") {
          const detailKeys = Object.keys(step.details);
          console.log(`       Details: ${detailKeys.join(", ")}`);
        }
      });

      console.log(
        `✅ Educational steps comprehensive: ${educationalSteps.length} steps`
      );
    });

    test("should provide different educational content for different complexity levels", () => {
      console.log("\n🧪 Testing educational content variation by complexity");

      // 간단한 조건부 타입
      const simpleAlias = findTypeAlias("IsString");
      const simpleType = checker.getTypeFromTypeNode(simpleAlias!.type);
      const simpleNode = handler.createTypeNode(
        simpleType,
        simpleAlias!.type,
        context
      );

      // 복합 조건부 타입
      const complexAlias = findTypeAlias("TemplateInfer");
      const complexType = checker.getTypeFromTypeNode(complexAlias!.type);
      const complexNode = handler.createTypeNode(
        complexType,
        complexAlias!.type,
        context
      );

      const simpleSteps = simpleNode.metadata?.educationalSteps?.length || 0;
      const complexSteps = complexNode.metadata?.educationalSteps?.length || 0;

      const simpleComplexity =
        simpleNode.metadata?.conditionalEvaluationInfo?.complexityLevel;
      const complexComplexity =
        complexNode.metadata?.conditionalEvaluationInfo?.complexityLevel;

      console.log(
        `   Simple type steps: ${simpleSteps} (complexity: ${simpleComplexity})`
      );
      console.log(
        `   Complex type steps: ${complexSteps} (complexity: ${complexComplexity})`
      );

      // 복합 타입이 더 많은 교육적 단계를 가져야 함
      expect(complexSteps).toBeGreaterThanOrEqual(simpleSteps);
      expect(complexComplexity).not.toBe("simple");

      console.log(`✅ Educational content varies by complexity`);
    });
  });

  /**
   * 🧪 테스트 6: 에러 처리 및 엣지 케이스
   */
  describe("Error Handling and Edge Cases", () => {
    test("should handle malformed conditional types gracefully", () => {
      console.log("\n🧪 Testing error handling for malformed types");

      // 빈 컨텍스트로 테스트
      const typeNode = handler.createTypeNode(
        checker.getAnyType(),
        undefined,
        undefined
      );

      // 에러 노드가 생성되어야 함
      expect(typeNode.kind).toBe("unknown");
      expect(typeNode.metadata?.debug?.warnings).toBeDefined();
      expect(typeNode.metadata?.debug?.fallbackUsed).toBe(true);

      console.log(`✅ Error handling verified`);
    });

    test("should handle non-conditional types correctly", () => {
      console.log("\n🧪 Testing non-conditional type rejection");

      const primitiveType = checker.getStringType();
      const isApplicable = handler.isApplicable(primitiveType);

      expect(isApplicable).toBe(false);

      console.log(`✅ Non-conditional types correctly rejected`);
    });
  });

  // ==============================
  // 🔧 테스트 헬퍼 함수들
  // ==============================

  function findTypeAlias(name: string): ts.TypeAliasDeclaration | undefined {
    for (const statement of sourceFile.statements) {
      if (
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === name
      ) {
        return statement;
      }
    }
    return undefined;
  }

  /**
   * 🧪 테스트 실행 및 결과 요약
   */
  afterAll(() => {
    console.log("\n🎉 ConditionalTypeHandler tests completed!");
    console.log("📊 Test Coverage Summary:");
    console.log("   ✅ Basic conditional types");
    console.log("   ✅ Infer-based conditional types");
    console.log("   ✅ Handler interactions");
    console.log("   ✅ IR structure validation");
    console.log("   ✅ Educational steps generation");
    console.log("   ✅ Error handling");

    console.log("\n🔗 Handler Integration Summary:");
    console.log("   📝 ConditionalTypeHandler processes T extends U ? X : Y");
    console.log("   🔬 Includes infer support (moved from InferTypeHandler)");
    console.log(
      "   🔗 Calls globalHandlerRegistry.createTypeNode() for components"
    );
    console.log("   🎓 Generates rich educational content");
    console.log("   📊 Creates comprehensive IR structures");
  });
});

/**
 * 🚀 실제 TypeScript 파일을 사용한 통합 테스트 실행 함수
 */
export function runConditionalTypeHandlerTests(): void {
  console.log("🚀 Running ConditionalTypeHandler integration tests...");

  // Jest 없이도 실행 가능한 간단한 테스트 러너
  const testSuite = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  function runTest(name: string, testFn: () => void): void {
    testSuite.total++;
    try {
      console.log(`\n🧪 Running: ${name}`);
      testFn();
      testSuite.passed++;
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      testSuite.failed++;
      console.error(`❌ FAILED: ${name}`, error);
    }
  }

  // 기본 설정
  setGlobalDebugMode(true);
  initializeAvailableHandlers();
  const handler = new ConditionalTypeHandler();

  // 테스트 코드
  const sourceCode = `
    type IsString<T> = T extends string ? "yes" : "no";
    type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
    type ArrayElement<T> = T extends (infer U)[] ? U : never;
  `;

  const program = ts.createProgram(
    ["test.ts"],
    {
      target: ts.ScriptTarget.ES2022,
      strictNullChecks: true,
    },
    {
      getSourceFile: (fileName) => {
        if (fileName === "test.ts") {
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
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
    }
  );

  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile("test.ts")!;
  const context = createTypeCreationContext(checker, program, sourceFile);

  // 실제 테스트들
  runTest("Basic conditional type processing", () => {
    const isStringAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const aliasType = checker.getTypeFromTypeNode(isStringAlias.type);
    const typeNode = handler.createTypeNode(
      aliasType,
      isStringAlias.type,
      context
    );

    if (typeNode.kind !== "conditional")
      throw new Error("Expected conditional type");
    if (!typeNode.conditionalInfo) throw new Error("Missing conditional info");
    if (!typeNode.metadata?.educationalSteps)
      throw new Error("Missing educational steps");
  });

  runTest("Infer-based conditional type processing", () => {
    const returnTypeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
    const aliasType = checker.getTypeFromTypeNode(returnTypeAlias.type);
    const typeNode = handler.createTypeNode(
      aliasType,
      returnTypeAlias.type,
      context
    );

    if (typeNode.kind !== "conditional")
      throw new Error("Expected conditional type");
    if (!typeNode.metadata?.conditionalEvaluationInfo?.hasInfer)
      throw new Error("Missing infer detection");
  });

  runTest("Handler interaction verification", () => {
    const arrayElementAlias = sourceFile
      .statements[2] as ts.TypeAliasDeclaration;
    const aliasType = checker.getTypeFromTypeNode(arrayElementAlias.type);
    const typeNode = handler.createTypeNode(
      aliasType,
      arrayElementAlias.type,
      context
    );

    if (!typeNode.conditionalInfo) throw new Error("Missing conditional info");
    if (typeNode.children?.length !== 4)
      throw new Error("Expected 4 child components");
  });

  // 결과 출력
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testSuite.passed}`);
  console.log(`   ❌ Failed: ${testSuite.failed}`);
  console.log(`   📊 Total: ${testSuite.total}`);
  console.log(
    `   🎯 Success Rate: ${Math.round(
      (testSuite.passed / testSuite.total) * 100
    )}%`
  );
}

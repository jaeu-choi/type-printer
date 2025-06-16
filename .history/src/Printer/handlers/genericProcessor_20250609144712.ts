// src/handlers/genericProcessor.ts

import * as ts from "typescript";
import { TypeNode, TypeCreationContext, createChildContext } from "../ir";

/**
 * 제네릭 처리 전용 모듈
 *
 * 역할:
 * 1. AST에서 제네릭 인스턴스 감지 (IsString<string>)
 * 2. 제네릭 정의 찾기 및 분석 (T extends string ? "yes" : "no")
 * 3. 컨텍스트 보강 (T = string 매핑 추가)
 * 4. 교육적 단계 정보 생성
 */
export class GenericProcessor {
  constructor(
    private readonly checker: ts.TypeChecker,
    private readonly sourceFile: ts.SourceFile
  ) {}

  /**
   * 제네릭 인스턴스인지 감지
   * MyGeneric<string>, IsString<number> 등
   */
  static isGenericInstance(typeNode: ts.TypeNode): boolean {
    return (
      ts.isTypeReferenceNode(typeNode) &&
      typeNode.typeArguments !== undefined &&
      typeNode.typeArguments.length > 0
    );
  }

  /**
   * 제네릭 처리 메인 함수
   */
  processGenericInstance(
    typeNode: ts.TypeNode,
    context: TypeCreationContext
  ): GenericProcessResult {
    if (!GenericProcessor.isGenericInstance(typeNode)) {
      throw new Error("Not a generic instance");
    }

    const refNode = typeNode as ts.TypeReferenceNode;

    // 1. 제네릭 정보 추출
    const genericInfo = this.extractGenericInfo(refNode);

    // 2. 제네릭 정의 찾기
    const definition = this.findGenericDefinition(genericInfo.genericName);

    // 3. 매개변수 매핑 생성
    const parameterMappings = this.createParameterMappings(
      definition,
      genericInfo.typeArguments,
      context
    );

    // 4. 보강된 컨텍스트 생성
    const enhancedContext = this.createEnhancedContext(
      context,
      parameterMappings
    );

    // 5. 교육적 단계 생성
    const educationalSteps = this.createEducationalSteps(
      genericInfo,
      definition,
      parameterMappings
    );

    return {
      isGeneric: true,
      originalExpression: refNode.getText(),
      genericName: genericInfo.genericName,
      typeArguments: genericInfo.typeArguments,
      definition,
      parameterMappings,
      enhancedContext,
      educationalSteps,
    };
  }

  /**
   * TypeReferenceNode에서 제네릭 정보 추출
   */
  private extractGenericInfo(refNode: ts.TypeReferenceNode): GenericInfo {
    const genericName = refNode.typeName.getText();
    const typeArguments =
      refNode.typeArguments?.map((arg) => arg.getText()) || [];

    return {
      genericName,
      typeArguments,
      rawNode: refNode,
    };
  }

  /**
   * 제네릭 정의 찾기
   */
  private findGenericDefinition(genericName: string): GenericDefinition | null {
    // 소스 파일에서 타입 별칭 또는 인터페이스 찾기
    for (const statement of this.sourceFile.statements) {
      if (
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === genericName
      ) {
        return this.analyzeTypeAliasDefinition(statement);
      }

      if (
        ts.isInterfaceDeclaration(statement) &&
        statement.name.text === genericName
      ) {
        return this.analyzeInterfaceDefinition(statement);
      }
    }

    return null;
  }

  /**
   * 타입 별칭 정의 분석
   */
  private analyzeTypeAliasDefinition(
    declaration: ts.TypeAliasDeclaration
  ): GenericDefinition {
    const typeParameters =
      declaration.typeParameters?.map((tp) => ({
        name: tp.name.text,
        constraint: tp.constraint?.getText(),
        default: tp.default?.getText(),
      })) || [];

    return {
      name: declaration.name.text,
      typeParameters,
      definition: declaration.type,
      definitionText: declaration.type.getText(),
      kind: "type-alias",
    };
  }

  /**
   * 인터페이스 정의 분석
   */
  private analyzeInterfaceDefinition(
    declaration: ts.InterfaceDeclaration
  ): GenericDefinition {
    const typeParameters =
      declaration.typeParameters?.map((tp) => ({
        name: tp.name.text,
        constraint: tp.constraint?.getText(),
        default: tp.default?.getText(),
      })) || [];

    return {
      name: declaration.name.text,
      typeParameters,
      definition: declaration,
      definitionText: declaration.getText(),
      kind: "interface",
    };
  }

  /**
   * 매개변수 매핑 생성 (T → string)
   */
  private createParameterMappings(
    definition: GenericDefinition | null,
    typeArguments: string[],
    context: TypeCreationContext
  ): Map<string, TypeArgumentMapping> {
    const mappings = new Map<string, TypeArgumentMapping>();

    if (!definition) return mappings;

    // 타입 매개변수와 인수 매핑
    definition.typeParameters.forEach((param, index) => {
      if (index < typeArguments.length) {
        const argumentText = typeArguments[index];

        mappings.set(param.name, {
          parameterName: param.name,
          argumentText,
          constraint: param.constraint,
          originalParameter: param,
        });
      }
    });

    return mappings;
  }

  /**
   * 보강된 컨텍스트 생성
   */
  private createEnhancedContext(
    baseContext: TypeCreationContext,
    parameterMappings: Map<string, TypeArgumentMapping>
  ): TypeCreationContext {
    // 제네릭 컨텍스트에 매핑 추가
    const genericContext = new Map(baseContext.genericContext);

    parameterMappings.forEach((mapping, paramName) => {
      // 간단한 TypeNode 생성 (실제로는 더 정교하게 처리 필요)
      const argumentNode: TypeNode = {
        kind: "reference",
        name: mapping.argumentText,
        metadata: {
          originalText: mapping.argumentText,
          finalTypeString: mapping.argumentText,
        },
      };

      genericContext.set(paramName, argumentNode);
    });

    return {
      ...baseContext,
      genericContext,
      // 제네릭 처리 중임을 표시
      isInstantiated: true,
    };
  }

  /**
   * 교육적 단계 생성
   */
  private createEducationalSteps(
    genericInfo: GenericInfo,
    definition: GenericDefinition | null,
    parameterMappings: Map<string, TypeaArgumentMapping>
  ): EducationalStep[] {
    const steps: EducationalStep[] = [];

    // Step 1: 제네릭 인스턴스 감지
    steps.push({
      type: "generic-detection",
      description: `Generic instance detected: ${
        genericInfo.genericName
      }<${genericInfo.typeArguments.join(", ")}>`,
      input: genericInfo.rawNode.getText(),
      details: {
        genericName: genericInfo.genericName,
        arguments: genericInfo.typeArguments,
      },
    });

    // Step 2: 정의 찾기
    if (definition) {
      steps.push({
        type: "definition-lookup",
        description: `Found definition: ${definition.definitionText}`,
        input: definition.name,
        output: definition.definitionText,
        details: {
          definitionKind: definition.kind,
          typeParameters: definition.typeParameters.map((tp) => tp.name),
        },
      });
    }

    // Step 3: 매개변수 매핑
    if (parameterMappings.size > 0) {
      const mappingDescriptions = Array.from(parameterMappings.entries()).map(
        ([param, mapping]) => `${param} = ${mapping.argumentText}`
      );

      steps.push({
        type: "parameter-mapping",
        description: `Parameter mapping: ${mappingDescriptions.join(", ")}`,
        details: {
          mappings: Object.fromEntries(parameterMappings),
        },
      });
    }

    // Step 4: 인스턴스화 시작
    steps.push({
      type: "instantiation-start",
      description: "Starting generic instantiation with enhanced context",
      details: {
        enhancedContext: true,
        parameterCount: parameterMappings.size,
      },
    });

    return steps;
  }
}

// 타입 정의들
export interface GenericProcessResult {
  isGeneric: boolean;
  originalExpression: string;
  genericName: string;
  typeArguments: string[];
  definition: GenericDefinition | null;
  parameterMappings: Map<string, TypeArgumentMapping>;
  enhancedContext: TypeCreationContext;
  educationalSteps: EducationalStep[];
}

export interface GenericInfo {
  genericName: string;
  typeArguments: string[];
  rawNode: ts.TypeReferenceNode;
}

export interface GenericDefinition {
  name: string;
  typeParameters: TypeParameter[];
  definition: ts.TypeNode | ts.InterfaceDeclaration;
  definitionText: string;
  kind: "type-alias" | "interface";
}

export interface TypeParameter {
  name: string;
  constraint?: string;
  default?: string;
}

export interface TypeArgumentMapping {
  parameterName: string;
  argumentText: string;
  constraint?: string;
  originalParameter: TypeParameter;
}

export interface EducationalStep {
  type:
    | "generic-detection"
    | "definition-lookup"
    | "parameter-mapping"
    | "instantiation-start";
  description: string;
  input?: string;
  output?: string;
  details?: any;
}

// 편의 함수들
export function createGenericProcessor(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): GenericProcessor {
  return new GenericProcessor(checker, sourceFile);
}

export function isGenericInstance(typeNode: ts.TypeNode): boolean {
  return GenericProcessor.isGenericInstance(typeNode);
}

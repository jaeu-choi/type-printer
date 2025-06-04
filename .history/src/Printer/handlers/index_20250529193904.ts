import * as ts from "typescript";
import { TypeHandler, TypeStructure, TypeCollectionContext } from "../types";
import { OperatorTypeHandler } from "./operatorType";
import { IndexAccessHandler } from "./indexAccess";
import { ConditionalTypeHandler } from "./conditionalType";
import { ReferenceTypeHandler } from "./referenceType";
import { PrimitiveTypeHandler } from "./primitiveType";
import { UnionTypeHandler } from "./unionType";
import { IntersectionTypeHandler } from "./intersectionType";
import { ArrayTypeHandler } from "./arrayType";
import { ObjectLiteralTypeHandler } from "./objectLiteral";
import { FallbackTypeHandler } from "./fallback";

export class TypeStructureCollector {
  private handlers: TypeHandler[] = [
    new OperatorTypeHandler(),
    new IndexAccessHandler(),
    new ConditionalTypeHandler(),
    new ReferenceTypeHandler(),
    new UnionTypeHandler(),
    new IntersectionTypeHandler(),
    new ArrayTypeHandler(),
    new ObjectLiteralTypeHandler(),
    new PrimitiveTypeHandler(),
    new FallbackTypeHandler(),
  ];

  collect(node: ts.TypeNode, context: TypeCollectionContext): TypeStructure {
    for (const handler of this.handlers) {
      if (handler.canHandle(node)) {
        return handler.handle(node, context);
      }
    }

    throw new Error("No handler found for type node");
  }
}

export * from "./operatorType";
export * from "./indexAccess";
export * from "./conditionalType";
export * from "./referenceType";
export * from "./primitiveType";
export * from "./unionType";
export * from "./intersectionType";
export * from "./arrayType";
export * from "./objectLiteral";
export * from "./fallback";
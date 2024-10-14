import { partition } from 'base-up'
import { Result } from 'result-type-ts'

export type SchemaBase<T = any> = { type: string; validate: (value: T) => any }
export type ConverterSchema<T = any> = {
  type: string
  validate: (value: T) => ValidateResult<any> & { converted?: true }
}
export type NonConverterSchema<T = any> = {
  type: string
  validate: (value: T) => ValidateResult<any> & { converted?: false }
}
export type ValidateError = { message: string; path: (keyof any)[] }
export type ValidateResult<T = unknown> = Result<T, ValidateError>
export type ConverterResult<T = unknown> = Result<T, ValidateError> & { converted?: true }
export type NonConverterResult<T = unknown> = Result<T, ValidateError> & { converted?: false }

function failure(message: string, path: (keyof any)[] = []): Result.Failure<ValidateError> {
  return Result.failure({ message, path })
}

export const boolean = {
  type: 'boolean',
  validate: (value: unknown): NonConverterResult<boolean> =>
    typeof value === 'boolean' ? Result.success(value) : failure('not a boolean'),
} as const
export const number = {
  type: 'number',
  validate: (value: unknown): NonConverterResult<number> =>
    typeof value === 'number' ? Result.success(value) : failure('not a number'),
} as const
export const bigint = {
  type: 'bigint',
  validate: (value: unknown): NonConverterResult<bigint> =>
    typeof value === 'bigint' ? Result.success(value) : failure('not a bigint'),
} as const
export const string = {
  type: 'string',
  validate: (value: unknown): NonConverterResult<string> =>
    typeof value === 'string' ? Result.success(value) : failure('not a string'),
} as const
export const symbol = {
  type: 'symbol',
  validate: (value: unknown): NonConverterResult<symbol> =>
    typeof value === 'symbol' ? Result.success(value) : failure('not a symbol'),
} as const

export const unknown = {
  type: 'unknown',
  validate: (value: unknown): NonConverterResult<unknown> => Result.success(value),
} as const
export const any = {
  type: 'any',
  validate: (value: unknown): NonConverterResult<any> => Result.success(value),
} as const
export const never = {
  type: 'never',
  validate: (value: unknown): NonConverterResult<never> => failure('never type does not accept any value'),
} as const

export type Optional = { type: 'optional'; schema: SchemaBase<unknown>; validate?: never }
export type ConverterOptional = { type: 'optional'; schema: ConverterSchema<unknown>; validate?: never }
export type NonConverterOptional = { type: 'optional'; schema: NonConverterSchema<unknown>; validate?: never }
export const optional = <T extends SchemaBase<unknown>>(schema: T) => ({ type: 'optional', schema }) as const

const objectFunction = <T extends Record<keyof any, SchemaBase<unknown> | Optional>>(properties: T) =>
  ({
    type: 'properties',
    properties,
    validate: (
      value: unknown,
    ): T extends Record<keyof any, NonConverterSchema<unknown> | NonConverterOptional>
      ? NonConverterResult
      : ConverterResult => {
      // When it's not even an object.
      if (typeof value !== 'object' || value === null) return failure('not an object')

      let changedValue = value

      const [optionalPropertyKeys, requiredPropertyKeys] = partition(
        Reflect.ownKeys(properties),
        (key) => properties[key as any]!.type === 'optional',
      )
      // Validate required properties.
      for (const key of requiredPropertyKeys) {
        if (!(key in value)) return failure('missing required property', [key])

        const propertySchema = properties[key as any]! as SchemaBase
        const result: ValidateResult = propertySchema.validate((value as any)[key])
        if (result.isFailure) return failure(result.error.message, [...result.error.path, key])

        if (result.value !== (value as any)[key]) changedValue = { ...changedValue, [key]: result.value }
      }
      // Validate optional properties.
      for (const key of optionalPropertyKeys) {
        if (!(key in value)) continue

        const propertySchema = properties[key as any]! as Optional
        const result: ValidateResult = propertySchema.schema.validate((value as any)[key])
        if (result.isFailure) return result.mapError(({ message, path }) => ({ message, path: [...path, key] }))

        if (result.value !== (value as any)[key]) changedValue = { ...changedValue, [key]: result.value }
      }
      return Result.success(changedValue)
    },
  }) as const
export const object = Object.assign(objectFunction, {
  type: 'object',
  validate: (value: unknown): NonConverterResult<object> =>
    typeof value === 'object' && value !== null ? Result.success(value) : failure('not an object'),
} as const)

export const Array_ = <T extends SchemaBase<unknown>>(element: T) =>
  ({
    type: 'Array',
    element,
    validate: (value: unknown): T extends NonConverterSchema<unknown> ? NonConverterResult : ConverterResult => {
      // When it's not even an object.
      if (!Array.isArray(value)) return failure('not an array')

      let changedValue = value

      // Validate each element.
      for (let i = 0; i < value.length; i++) {
        const result: ValidateResult = element.validate(value[i])
        if (result.isFailure) return failure(result.error.message, [i, ...result.error.path])

        if (result.value !== value[i]) changedValue = changedValue.toSpliced(i, 1, result.value)
      }
      return Result.success(changedValue)
    },
  }) as const

export const recursive = <const T extends () => any>(lazy: T) =>
  ({
    type: 'recursive',
    lazy,
    validate: (value: unknown): T extends () => NonConverterSchema ? NonConverterResult : ConverterResult =>
      (lazy as () => SchemaBase)().validate(value),
  }) as const

export const convert = <T, U>(converter: (value: T) => U) =>
  ({
    type: 'convert',
    converter,
    validate: (value: T): ConverterResult<U> => {
      try {
        return Result.success(converter(value))
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return failure(message)
      }
    },
  }) as const

export const predicate = <T, U extends T = T>(f: ((value: T) => value is U) | ((value: T) => boolean)) =>
  ({
    type: 'predicate',
    predicate: f,
    validate: (value: T): NonConverterResult<U> => {
      if (f(value)) return Result.success(value as U)

      if (f.name) return failure(`predicate ${f.name} not met: ${f}`)
      return failure(`predicate not met: ${f}`)
    },
  }) as const

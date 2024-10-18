import { Result } from 'result-type-ts'

export type BaseSchema<T = any> = { type: string; validate: (input: T) => any }
export type ConverterSchema<T = any> = {
  type: string
  validate: (input: T) => ValidateResult<any> & { converted?: true }
}
export type NonConverterSchema<T = any> = {
  type: string
  validate: (input: T) => ValidateResult<any> & { converted?: false }
}
export type ValidateError = { message: string; path: (keyof any)[] }
export type ValidateResult<T = unknown> = Result<T, ValidateError>
export type ConverterResult<T = unknown> = Result<T, ValidateError> & { converted?: true }
export type NonConverterResult<T = unknown> = Result<T, ValidateError> & { converted?: false }

export function failure(message: string, path: (keyof any)[] = []): Result.Failure<ValidateError> {
  return Result.failure({ message, path })
}

export const or = <const T extends readonly BaseSchema[]>(...schemas: T) =>
  ({
    type: 'or',
    schemas,
    validate: (input: unknown): OrOutput<T> => {
      const errorMessages: string[] = []
      for (const schema of schemas) {
        const result = schema.validate(input)
        if (result.isSuccess) return result

        errorMessages.push(result.error.message)
      }

      return failure(
        `must resolve any one of the following issues: ${errorMessages.map((message, i) => `(${i + 1}) ${message}`).join(' ')}`,
      ) as any
    },
  }) as const
type OrOutput<T extends readonly BaseSchema[]> = T[number]['validate'] extends (input: any) => ValidateResult<infer R>
  ? ValidateResult<R>
  : never

export const recursive = <const T extends () => any>(lazy: T) =>
  ({
    type: 'recursive',
    lazy,
    validate: (input: unknown): T extends () => NonConverterSchema ? NonConverterResult : ConverterResult =>
      (lazy as () => BaseSchema)().validate(input),
  }) as const

export const convert = <T, U>(converter: (value: T) => U) =>
  ({
    type: 'convert',
    converter,
    validate: (input: T): ConverterResult<U> => {
      try {
        return Result.success(converter(input))
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
    validate: (input: T): NonConverterResult<U> => {
      if (f(input)) return Result.success(input as U)

      if (f.name) return failure(`predicate ${f.name} not met: ${f}`)
      return failure(`predicate not met: ${f}`)
    },
  }) as const

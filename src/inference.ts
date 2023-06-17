import { NonEmptyArray, Simplify } from 'base-up'
import {
  _null,
  _void,
  any,
  array,
  bigint,
  boolean,
  intersection,
  literal,
  never,
  nonEmptyArray,
  number,
  object,
  record,
  recursion,
  recursive,
  Schema,
  string,
  symbol,
  tuple,
  undefined,
  union,
  unknown,
} from './schema'

export type Infer<T, Z = T> = T extends typeof unknown
  ? unknown
  : T extends typeof any
  ? any
  : T extends typeof never
  ? never
  : T extends typeof _null
  ? null
  : T extends typeof _void
  ? void
  : T extends typeof undefined
  ? undefined
  : T extends typeof boolean
  ? boolean
  : T extends typeof number
  ? number
  : T extends typeof bigint
  ? bigint
  : T extends typeof string
  ? string
  : T extends typeof symbol
  ? symbol
  : T extends ReturnType<typeof literal<infer L extends string | number | bigint | boolean | null | undefined>>
  ? L
  : T extends ReturnType<typeof array<infer U extends Schema>>
  ? Infer<U, Z>[]
  : T extends ReturnType<typeof nonEmptyArray<infer U extends Schema>>
  ? NonEmptyArray<Infer<U, Z>>
  : T extends ReturnType<typeof recursive<infer U extends Schema>>
  ? Infer<U>
  : T extends ReturnType<
      typeof object<infer R extends Record<keyof any, Schema>, infer O extends Record<keyof any, Schema>>
    >
  ? InferObjectType<R, O, Z>
  : T extends ReturnType<typeof union<infer A extends readonly Schema[]>>
  ? InferUnionType<A, Z>
  : T extends ReturnType<typeof intersection<infer A extends readonly Schema[]>>
  ? InferIntersectionType<A, Z>
  : T extends ReturnType<typeof tuple<infer A extends readonly Schema[]>>
  ? InferTupleType<A, Z>
  : T extends ReturnType<typeof record<infer Key extends Schema, infer Value extends Schema>>
  ? Infer<Key, Z> extends infer K extends keyof any
    ? Record<K, Infer<Value, Z>>
    : never
  : T extends typeof recursion
  ? Infer<Z, Z>
  : never

type InferObjectType<T, U, Z> = Simplify<
  {
    [K in keyof T]: Infer<T[K], Z>
  } & {
    [K in keyof U]?: Infer<U[K], Z>
  }
>

type InferUnionType<T extends readonly any[], Z> = T extends readonly [infer H, ...infer L]
  ? Infer<H, Z> | InferUnionType<L, Z>
  : never

type InferIntersectionType<T extends readonly any[], Z> = T extends readonly [infer H, ...infer L]
  ? Infer<H, Z> & InferUnionType<L, Z>
  : unknown

type InferTupleType<T extends readonly any[], Z> = T extends readonly [infer H, ...infer L]
  ? [Infer<H, Z>, ...InferTupleType<L, Z>]
  : []
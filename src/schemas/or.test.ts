import { Result } from 'result-type-ts'
import { expect, test } from 'vitest'
import * as z from '../index'
import { expectInferredType } from '../utilities'

test('or schema', () => {
  expectInferredType(z.or(z.number, z.string)).toBe<number | string>()
  expectInferredType(z.or(z.boolean, z.null, z.undefined)).toBe<boolean | null | undefined>()
  expectInferredType(
    z.or(
      z.predicate((value) => value === 0),
      z.predicate((value) => value === 1),
    ),
  ).toBe<0 | 1>()
  expectInferredType(z.or(z.Array(z.never), z.object({}))).toBe<never[] | {}>()
  expect(z.validate(z.or(z.number, z.string), 1)).toStrictEqual(Result.success(1))
  expect(z.validate(z.or(z.number, z.string), 'a')).toStrictEqual(Result.success('a'))
  expect(z.validate(z.or(z.number, z.string), true)).toStrictEqual(
    Result.failure({
      message: 'must resolve any one of the following issues: (1) not a number (2) not a string',
      path: [],
    }),
  )
  expect(z.validate(z.or(z.convert(JSON.parse), z.convert(String)), undefined)).toStrictEqual(
    Result.success('undefined'),
  )
})

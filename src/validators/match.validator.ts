import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

/**
 * Match decorator
 *
 * Validates that the value of the decorated property
 * is strictly equal (`===`) to another property on the same object.
 *
 * Common use cases:
 *  - Confirm password / confirm email
 *  - Repeat sensitive fields
 *
 * @param property - The name of the related property to compare against
 * @param validationOptions - Optional class-validator validation options
 *
 * @example
 * ```ts
 * export class RegisterDto {
 *   password: string;
 *
 *   @Match('password', { message: 'Passwords do not match' })
 *   confirmPassword: string;
 * }
 * ```
 */
export function Match(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "match",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        /**
         * Validation logic
         *
         * @param value - Current property value
         * @param args - Validation arguments provided by class-validator
         * @returns true if values match, otherwise false
         */
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },

        /**
         * Default error message when validation fails.
         * Can be overridden via ValidationOptions.message.
         */
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must match ${relatedPropertyName}`;
        },
      },
    });
  };
}
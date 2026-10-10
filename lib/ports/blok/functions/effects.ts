import {z} from 'zod';
import {createVariadicBlokFunction} from '../runtime';

/**
 * Effectful functions. Orkestrator's also toast and copy to the clipboard;
 * pokket evaluates calls only in value position (validators, hide effects),
 * where anything with a side effect is refused, so these exist to be refused:
 * a call naming one fails as "has side effects", not as an unknown function.
 */

const describe = (values: unknown[]): unknown => (values.length === 1 ? values[0] : values);

const createLoggerFunction = (level: 'info' | 'warn' | 'error') =>
  createVariadicBlokFunction(
    {
      name: `logger.${level}`,
      description: `Logs its arguments at ${level} level.`,
      returnType: 'unknown',
      purity: 'effect',
      item: z.unknown(),
      min: 1,
    },
    values => {
      const message = describe(values);
      console[level](`blok logger.${level}`, message);
      return message;
    },
  );

export const effectFunctions = [
  createLoggerFunction('info'),
  createLoggerFunction('warn'),
  createLoggerFunction('error'),
];

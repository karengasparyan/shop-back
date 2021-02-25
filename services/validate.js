import _ from 'lodash';
import HttpError from 'http-errors';
import { Validator } from 'node-input-validator';

export default async function validate(inputs, rules, customMessages) {
  const v = new Validator(inputs, rules, customMessages);

  const matched = await v.check();
  if (!matched) {
    const errors = {};
    _.forEach(v.errors, (data, key) => {
      errors[key] = data.message;
    });
    throw new HttpError(422, { message: 'Unprocessable Entity', errors });
  }
}

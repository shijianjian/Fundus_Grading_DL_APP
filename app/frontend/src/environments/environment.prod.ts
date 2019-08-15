import { flask_config } from './environment-common';

export const environment = {
  production: true,
  mode: 'cloud' // cloud or local, determine to enable .csv based loading or not
};

export { flask_config };

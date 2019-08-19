
export const environment = {
  production: true,
  mode: 'cloud' // cloud or local, determine to enable .csv based loading or not
};

const flask_config = {
  // GCloud IP for compute engine
  'backend_url': 'http://35.227.184.144:5000'
}

export { flask_config };

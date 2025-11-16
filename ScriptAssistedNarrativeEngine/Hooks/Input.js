// Your "Input" tab should look like this
const modifier = (text) => {
  text = SANE("input", text);
  return {text};
};
modifier(text);
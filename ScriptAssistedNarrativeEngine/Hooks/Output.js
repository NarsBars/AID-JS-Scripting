// Your "Output" tab should look like this
const modifier = (text) => {
  text = SANE("output", text);
  return {text};
};
modifier(text);
// Your "Context" tab should look like this
const modifier = (text) => {
  Calendar("context"); // optional
  text = GiveMeHeaders(text); // optional
  text = GameState("context", text);
  return {text};
};
modifier(text);
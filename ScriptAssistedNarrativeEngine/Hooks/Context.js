// Your "Context" tab should look like this
  function removeContext(text) {
      if (!state.memory.context || !text) {
          return text;
      }

      const context = state.memory.context;

      // Find where context starts
      const startMarker = context.substring(0, Math.min(50, context.length));
      const startIdx = text.indexOf(startMarker);

      if (startIdx !== -1) {
          // Just remove approximately the right amount and trim whitespace
          let endPos = startIdx + context.length;

          // Skip any trailing whitespace (handles the \n issue)
          while (endPos < text.length && /\s/.test(text[endPos])) {
              endPos++;
          }

          return text.substring(endPos);
      }

      return text;
  } // this is optional, prob don't use this.
const modifier = (text) => {
//  text = removeContext(text);
  Calendar("context");
  text = GiveMeHeaders(text);
  text = SANE("context", text);
  return {text};
};
modifier(text);
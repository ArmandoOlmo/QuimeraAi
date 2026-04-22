const currentStyles = {
  paddingSize: "large",
  glassEffect: true,
  colors: {
    background: "oldBg",
    text: "oldText"
  }
};

const newStyles = { colors: { background: "newBg" } };

const merged = { ...currentStyles, ...newStyles };
console.log(merged);

import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";

/**
 * Extra bottom padding so the composer sits above the iOS keyboard.
 * Android uses windowSoftInputMode resize — do not add a second lift there.
 */
export function useKeyboardLift() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const onShow = (event: KeyboardEvent) => {
      setHeight(event.endCoordinates.height);
    };
    const onHide = () => setHeight(0);

    const show = Keyboard.addListener("keyboardWillShow", onShow);
    const hide = Keyboard.addListener("keyboardWillHide", onHide);
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

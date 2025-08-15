import { App } from "@/lib/app/App";
import React from "react";
import { Button } from "./ui/button";
import { Text } from "./ui/text";

export const Disconnect = () => {
  const disconnect = App.useDisconnect();


  return (
    <>
      <Button
        className="w-full "
        onPress={() => disconnect()}
      >
        <Text>Disconnect </Text>
      </Button>
    </>
  );
}
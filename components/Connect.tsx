import { App } from "@/lib/app/App";
import { discover } from "@/lib/arkitekt/fakts/discover";
import React from "react";
import { Button } from "./ui/button";
import { Text } from "./ui/text";

export const NotConnected = () => {
  const connect = App.useConnect();

  const [introspectError, setIntrospectError] = React.useState<string | null>(
    null
  );


  const handleConnect = (url: string) => {
    let controller = new AbortController();

    discover({ url, timeout: 2000, controller })
      .then((endpoint) => {
        connect({
          endpoint,
          controller,
        }).catch((e) => {
          setIntrospectError(e.message);
        });
      })
      .catch((e) => {
        setIntrospectError(e.message);
      });
  };

  return (
    <>
      <Button
        className="w-full cursor-pointer"
        variant={"ghost"}
        onPress={() => handleConnect("https://go.arkitekt.live")}
      >
        <Text>Connect </Text>
      </Button>
    </>
  );
}
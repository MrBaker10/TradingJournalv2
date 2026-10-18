"use client";

import { useEffect } from "react";

export const DISCARD_ACCOUNT_CHANGES =
  "Discard changes? Your account changes have not been saved.";

/** Protect the local account draft without persisting it outside the form. */
export function useUnsavedAccount(dirty: boolean, pending: boolean) {
  useEffect(() => {
    if (!dirty && !pending) return;
    let approvedDestination: string | null = null;
    const canLeave = () => !pending && window.confirm(DISCARD_ACCOUNT_CHANGES);
    function beforeUnload(event: BeforeUnloadEvent) {
      if (approvedDestination) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const destination = new URL(link.href);
      if (
        destination.origin === location.origin &&
        destination.pathname === location.pathname &&
        destination.search === location.search
      )
        return;
      if (!canLeave()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else {
        approvedDestination = destination.href;
      }
    }
    // Navigation API also covers same-document Back/Forward and router navigation.
    // Browsers without it still get link interception and the native unload prompt.
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    function navigate(event: Event) {
      const transition = event as Event & {
        destination: { sameDocument: boolean; url: string };
        navigationType: string;
        hashChange: boolean;
      };
      if (
        !event.cancelable ||
        !transition.destination.sameDocument ||
        transition.hashChange ||
        transition.navigationType === "reload"
      )
        return;
      if (transition.destination.url === approvedDestination) {
        approvedDestination = null;
        return;
      }
      if (!canLeave()) event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    navigation?.addEventListener("navigate", navigate);
    // Stop Next Link before its handler starts rendering the destination.
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      navigation?.removeEventListener("navigate", navigate);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, pending]);
}

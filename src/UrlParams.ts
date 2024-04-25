/*
Copyright 2022 - 2023 New Vector Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

// If you need to add a new flag to this interface, prefer a name that describes
// a specific behavior (such as 'confineToRoom'), rather than one that describes
// the situations that call for this behavior ('isEmbedded'). This makes it
// clearer what each flag means, and helps us avoid coupling Element Call's
// behavior to the needs of specific consumers.
export interface UrlParams {
  // Widget api related params
  widgetId: string | null;
  parentUrl: string | null;
  /**
   * Anything about what room we're pointed to should be from useRoomIdentifier which
   * parses the path and resolves alias with respect to the default server name, however
   * roomId is an exception as we need the room ID in embedded (matroyska) mode, and not
   * the room alias (or even the via params because we are not trying to join it). This
   * is also not validated, where it is in useRoomIdentifier().
   */
  roomId: string | null;
  /**
   * Whether the app should keep the user confined to the current call/room.
   */
  confineToRoom: boolean;
  /**
   * Whether upon entering a room, the user should be prompted to launch the
   * native mobile app. (Affects only Android and iOS.)
   */
  appPrompt: boolean;
  /**
   * Whether the app should pause before joining the call until it sees an
   * io.element.join widget action, allowing it to be preloaded.
   */
  preload: boolean;
  /**
   * Whether to hide the room header when in a call.
   */
  hideHeader: boolean;
  /**
   * Whether the controls should be shown. For screen recording no controls can be desired.
   */
  showControls: boolean;
  /**
   * Whether to hide the screen-sharing button.
   */
  hideScreensharing: boolean;
  /**
   * Whether to use end-to-end encryption.
   */
  e2eEnabled: boolean;
  /**
   * The user's ID (only used in matryoshka mode).
   */
  userId: string | null;
  /**
   * The display name to use for auto-registration.
   */
  displayName: string | null;
  /**
   * The device's ID (only used in matryoshka mode).
   */
  deviceId: string | null;
  /**
   * The base URL of the homeserver to use for media lookups in matryoshka mode.
   */
  baseUrl: string | null;
  /**
   * The BCP 47 code of the language the app should use.
   */
  lang: string | null;
  /**
   * The fonts which the interface should use, if not empty.
   */
  fonts: string[];
  /**
   * The factor by which to scale the interface's font size.
   */
  fontScale: number | null;
  /**
   * The Posthog analytics ID. It is only available if the user has given consent for sharing telemetry in element web.
   */
  analyticsID: string | null;
  /**
   * Whether the app is allowed to use fallback STUN servers for ICE in case the
   * user's homeserver doesn't provide any.
   */
  allowIceFallback: boolean;
  /**
   * E2EE password
   */
  password: string | null;
  /**
   * Whether we the app should use per participant keys for E2EE.
   */
  perParticipantE2EE: boolean;
  /**
   * Setting this flag skips the lobby and brings you in the call directly.
   * In the widget this can be combined with preload to pass the device settings
   * with the join widget action.
   */
  skipLobby: boolean;
  /**
   * Setting this flag makes element call show the lobby after leaving a call.
   * This is useful for video rooms.
   */
  returnToLobby: boolean;
  /**
   * The theme to use for element call.
   * can be "light", "dark", "light-high-contrast" or "dark-high-contrast".
   */
  theme: string | null;
  /** This defines the homeserver that is going to be used when joining a room.
   * It has to be set to a non default value for links to rooms
   * that are not on the default homeserver,
   * that is in use for the current user.
   */
  viaServers: string | null;
  /**
   * This defines the homeserver that is going to be used when registering
   * a new (guest) user.
   * This can be user to configure a non default guest user server when
   * creating a spa link.
   */
  homeserver: string | null;
}

// This is here as a stopgap, but what would be far nicer is a function that
// takes a UrlParams and returns a query string. That would enable us to
// consolidate all the data about URL parameters and their meanings to this one
// file.
export function editFragmentQuery(
  hash: string,
  edit: (params: URLSearchParams) => URLSearchParams
): string {
  const fragmentQueryStart = hash.indexOf("?");
  const fragmentParams = edit(
    new URLSearchParams(
      fragmentQueryStart === -1 ? "" : hash.substring(fragmentQueryStart)
    )
  );
  return `${hash.substring(
    0,
    fragmentQueryStart
  )}?${fragmentParams.toString()}`;
}

class ParamParser {
  private fragmentParams: URLSearchParams;
  private queryParams: URLSearchParams;

  public constructor(search: string, hash: string) {
    this.queryParams = new URLSearchParams(search);

    const fragmentQueryStart = hash.indexOf("?");
    this.fragmentParams = new URLSearchParams(
      fragmentQueryStart === -1 ? "" : hash.substring(fragmentQueryStart)
    );
  }

  // Normally, URL params should be encoded in the fragment so as to avoid
  // leaking them to the server. However, we also check the normal query
  // string for backwards compatibility with versions that only used that.
  public getParam(name: string): string | null {
    return this.fragmentParams.get(name) ?? this.queryParams.get(name);
  }

  public getAllParams(name: string): string[] {
    return [
      ...this.fragmentParams.getAll(name),
      ...this.queryParams.getAll(name),
    ];
  }

  public getFlagParam(name: string, defaultValue = false): boolean {
    const param = this.getParam(name);
    return param === null ? defaultValue : param !== "false";
  }
}

/**
 * Gets the app parameters for the current URL.
 * @param search The URL search string
 * @param hash The URL hash
 * @returns The app parameters encoded in the URL
 */
export const getUrlParams = (
  search = window.location.search,
  hash = window.location.hash
): UrlParams => {
  const parser = new ParamParser(search, hash);

  const fontScale = parseFloat(parser.getParam("fontScale") ?? "");

  return {
    widgetId: parser.getParam("widgetId"),
    parentUrl: parser.getParam("parentUrl"),

    // NB. we don't validate roomId here as we do in getRoomIdentifierFromUrl:
    // what would we do if it were invalid? If the widget API says that's what
    // the room ID is, then that's what it is.
    roomId: parser.getParam("room_id"),
    password: parser.getParam("password"),
    // This flag has 'embed' as an alias for historical reasons
    confineToRoom:
      parser.getFlagParam("confineToRoom") || parser.getFlagParam("embed"),
    appPrompt: parser.getFlagParam("appPrompt", true),
    preload: parser.getFlagParam("preload"),
    hideHeader: parser.getFlagParam("hideHeader"),
    showControls: parser.getFlagParam("showControls", true),
    hideScreensharing: parser.getFlagParam("hideScreensharing"),
    e2eEnabled: parser.getFlagParam("enableE2EE", true),
    userId: parser.getParam("userId"),
    displayName: parser.getParam("displayName"),
    deviceId: parser.getParam("device_id"),
    baseUrl: parser.getParam("baseUrl"),
    lang: parser.getParam("lang"),
    fonts: parser.getAllParams("font"),
    fontScale: Number.isNaN(fontScale) ? null : fontScale,
    analyticsID: parser.getParam("analyticsID"),
    allowIceFallback: parser.getFlagParam("allowIceFallback"),
    perParticipantE2EE: parser.getFlagParam("perParticipantE2EE"),
    skipLobby: parser.getFlagParam("skipLobby"),
    returnToLobby: parser.getFlagParam("returnToLobby"),
    theme: parser.getParam("theme"),
    viaServers: parser.getParam("viaServers"),
    homeserver: parser.getParam("homeserver"),
  };
};

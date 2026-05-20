/**
 * Microsoft Outlook/Office 365 Calendar Integration via Microsoft Graph API
 */

import type { CalendarEvent, CalendarSource } from "../../types/calendar";

interface OutlookCalendarEvent {
  id: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName?: string };
  importance?: "low" | "normal" | "high";
  showAs?: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown";
  isCancelled?: boolean;
}

interface OutlookEventsResponse {
  value: OutlookCalendarEvent[];
  "@odata.nextLink"?: string;
}

export class OutlookCalendarIntegration {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authority = "https://login.microsoftonline.com/common";
  private readonly scopes = [
    "Calendars.Read",
    "Calendars.ReadWrite",
    "offline_access",
    "openid",
    "User.Read",
  ];

  constructor() {
    const env =
      typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env
        : process.env;
    this.clientId = env.MICROSOFT_CLIENT_ID || "";
    this.clientSecret = env.MICROSOFT_CLIENT_SECRET || "";
    this.redirectUri =
      env.MICROSOFT_REDIRECT_URI ||
      `${env.SITE || "http://localhost:4321"}/api/calendar/outlook/callback`;
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(" "),
      response_type: "code",
      response_mode: "query",
      ...(state && { state }),
    });
    return `${this.authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch(`${this.authority}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch(`${this.authority}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    return response.json();
  }

  async fetchEvents(
    accessToken: string,
    options: { timeMin?: Date; timeMax?: Date; maxResults?: number } = {},
  ): Promise<OutlookEventsResponse> {
    if (!options.timeMin || !options.timeMax) {
      throw new Error("timeMin and timeMax are required for Outlook calendar view");
    }

    const params = new URLSearchParams({
      startDateTime: options.timeMin.toISOString(),
      endDateTime: options.timeMax.toISOString(),
      $top: (options.maxResults || 250).toString(),
      $orderby: "start/dateTime",
      $select: "id,subject,body,start,end,location,importance,showAs,isCancelled",
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          Prefer: 'outlook.timezone="UTC"',
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Outlook Calendar events: ${error}`);
    }

    return response.json();
  }

  convertToCalendarEvents(
    events: OutlookCalendarEvent[],
    source: CalendarSource,
    userId: string,
  ): Omit<CalendarEvent, "id" | "created_at" | "updated_at">[] {
    return events
      .filter((e) => !e.isCancelled && e.showAs !== "free")
      .map((event) => ({
        user_id: userId,
        source_id: source.id,
        external_id: event.id,
        title: event.subject || "Untitled Event",
        description: event.body?.content
          ? this.stripHtml(event.body.content)
          : undefined,
        start_time: this.normalizeDateTime(event.start.dateTime),
        end_time: this.normalizeDateTime(event.end.dateTime),
        location: event.location?.displayName || undefined,
        event_type: this.inferEventType(event),
        flexibility: "fixed" as const,
        importance: this.inferImportance(event),
      }));
  }

  private normalizeDateTime(dateTime: string): string {
    // Microsoft Graph returns datetimes without Z when UTC is preferred via header
    return new Date(dateTime.endsWith("Z") ? dateTime : dateTime + "Z").toISOString();
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private inferEventType(
    event: OutlookCalendarEvent,
  ): CalendarEvent["event_type"] {
    const title = (event.subject || "").toLowerCase();
    if (/\b(class|course|lecture|lab|seminar|tutorial)\b/i.test(title)) return "class";
    if (/\b(meeting|conference|call|interview|standup|sync)\b/i.test(title)) return "meeting";
    if (/\b(workout|gym|exercise|fitness|run|yoga|training)\b/i.test(title)) return "workout";
    if (/\b(lunch|dinner|breakfast|meal|eat|food)\b/i.test(title)) return "meal";
    if (/\b(break|rest|pause|coffee)\b/i.test(title)) return "break";
    return "personal";
  }

  private inferImportance(event: OutlookCalendarEvent): CalendarEvent["importance"] {
    if (event.importance === "high") return "high";
    if (event.importance === "low") return "low";
    const title = (event.subject || "").toLowerCase();
    if (/\b(urgent|critical|emergency|exam|deadline|presentation|final)\b/i.test(title)) return "critical";
    if (/\b(important|meeting|class|appointment|doctor)\b/i.test(title)) return "high";
    return "medium";
  }
}

export const outlookCalendar = new OutlookCalendarIntegration();

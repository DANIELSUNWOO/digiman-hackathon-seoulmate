import { apiRequest } from "../../api";
import { id } from "../chat/model";
import { parseCourseData } from "./model";
export type CourseRequest = (
  path: string,
  init: RequestInit,
  token: string,
) => Promise<unknown>;
export function createCourseApi(
  request: CourseRequest = (path, init, token) =>
    apiRequest<unknown>(path, init, token),
) {
  return {
    async load(token: string, matchId: number, signal?: AbortSignal) {
      id(matchId);
      if (!token.trim()) throw new Error("Token required");
      const [match, course] = await Promise.all([
        request(`/matches/${matchId}`, { method: "GET", signal }, token),
        request(`/matches/${matchId}/course`, { method: "GET", signal }, token),
      ]);
      return parseCourseData(match, course, matchId);
    },
  };
}
export type CourseApi = ReturnType<typeof createCourseApi>;

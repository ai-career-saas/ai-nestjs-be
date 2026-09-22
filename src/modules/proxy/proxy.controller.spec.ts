import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Must run before proxy.controller is evaluated, because it reads FASTAPI_URL at import time.
vi.hoisted(() => {
  process.env.FASTAPI_URL = "http://fastapi.test";
});
vi.mock("axios", () => ({ default: { post: vi.fn() } }));

import { ProxyController } from "./proxy.controller";

const post = axios.post as unknown as ReturnType<typeof vi.fn>;

/** Reads the multipart body that was handed to axios so its fields can be asserted. */
function sentBody(callIndex = 0): string {
  const form = post.mock.calls[callIndex][1] as { getBuffer(): Buffer };
  return form.getBuffer().toString();
}

const resume = {
  buffer: Buffer.from("%PDF resume bytes"),
  originalname: "cv.pdf",
  mimetype: "application/pdf",
} as Express.Multer.File;

describe("ProxyController", () => {
  let controller: ProxyController;

  beforeEach(() => {
    controller = new ProxyController();
    post.mockResolvedValue({ data: { ok: true } });
  });

  describe("request forwarding", () => {
    it("posts multipart form data to the FastAPI service with a 5 minute timeout", async () => {
      await controller.analyze({ message: "hi", career_goal: "Data Engineer" });

      const [url, , config] = post.mock.calls[0];
      expect(url).toBe("http://fastapi.test/analyze");
      expect(config.timeout).toBe(300000);
      expect(config.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    });

    it("returns the AI service's response body unchanged", async () => {
      post.mockResolvedValue({ data: { summary: "great fit", score: 91 } });

      await expect(controller.analyze({ message: "hi", career_goal: "x" })).resolves.toEqual({
        summary: "great fit",
        score: 91,
      });
    });

    it("propagates failures from the AI service", async () => {
      post.mockRejectedValue(new Error("timeout of 300000ms exceeded"));

      await expect(controller.analyze({ message: "hi", career_goal: "x" })).rejects.toThrow(
        "timeout",
      );
    });
  });

  describe("analyze", () => {
    it("forwards message, career goal and JSON-encodes object preferences", async () => {
      await controller.analyze({
        message: "Analyze me",
        career_goal: "Data Engineer",
        preferences: { focus: "roadmap" },
      });

      const body = sentBody();
      expect(body).toContain('name="message"\r\n\r\nAnalyze me');
      expect(body).toContain('name="career_goal"\r\n\r\nData Engineer');
      expect(body).toContain('name="preferences"\r\n\r\n{"focus":"roadmap"}');
    });

    it("omits fields that are undefined or null", async () => {
      await controller.analyze({ message: "Analyze me", career_goal: null });

      const body = sentBody();
      expect(body).toContain('name="message"');
      expect(body).not.toContain('name="career_goal"');
      expect(body).not.toContain('name="preferences"');
    });

    it("attaches an uploaded resume as resume_file with its original name and mime type", async () => {
      await controller.analyze({ message: "m", career_goal: "g" }, resume);

      const body = sentBody();
      expect(body).toContain('name="resume_file"; filename="cv.pdf"');
      expect(body).toContain("Content-Type: application/pdf");
      expect(body).toContain("%PDF resume bytes");
    });

    it("sends no file part when no resume is uploaded", async () => {
      await controller.analyze({ message: "m", career_goal: "g" });

      expect(sentBody()).not.toContain("resume_file");
    });
  });

  describe("generateInterview", () => {
    it('defaults job description to an empty string and experience level to "mid"', async () => {
      await controller.generateInterview({ target_role: "Backend Engineer" }, resume);

      const body = sentBody();
      expect(post.mock.calls[0][0]).toBe("http://fastapi.test/interview/generate");
      expect(body).toContain('name="target_role"\r\n\r\nBackend Engineer');
      expect(body).toContain('name="job_description"\r\n\r\n\r\n');
      expect(body).toContain('name="experience_level"\r\n\r\nmid');
    });

    it("forwards provided job description and experience level", async () => {
      await controller.generateInterview({
        target_role: "Backend Engineer",
        job_description: "Build NestJS APIs",
        experience_level: "senior",
      });

      const body = sentBody();
      expect(body).toContain('name="job_description"\r\n\r\nBuild NestJS APIs');
      expect(body).toContain('name="experience_level"\r\n\r\nsenior');
    });
  });

  describe("atsScore", () => {
    it("forwards only the job description and the resume to /ats/score", async () => {
      await controller.atsScore(
        { job_description: "Node.js and SQL", unexpected: "ignored" },
        resume,
      );

      const body = sentBody();
      expect(post.mock.calls[0][0]).toBe("http://fastapi.test/ats/score");
      expect(body).toContain('name="job_description"\r\n\r\nNode.js and SQL');
      expect(body).toContain('filename="cv.pdf"');
      expect(body).not.toContain("unexpected");
    });
  });

  describe("skillUpgrade", () => {
    it("maps careerTitle to the snake_case career_title expected by the AI service", async () => {
      await controller.skillUpgrade({ careerTitle: "Software Engineer" });

      const body = sentBody();
      expect(post.mock.calls[0][0]).toBe("http://fastapi.test/skill-upgrade");
      expect(body).toContain('name="career_title"\r\n\r\nSoftware Engineer');
      expect(body).not.toContain("careerTitle");
    });
  });
});

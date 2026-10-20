import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText } from "lucide-react";

interface Section {
    heading: string | null;
    body: string;
}

// A line that is only a bold title ("**Paper Title**") or a markdown heading starts a new section.
const SECTION_HEADING = /^\s*(?:\*\*(.+?)\*\*|#{1,3}\s+(.+?))\s*:?\s*$/;

/**
 * Splits AI output into per-paper/per-topic sections so multi-paper results read as separate
 * cards instead of one wall of text. Falls back to a single document when there's no structure.
 */
function splitSections(text: string): Section[] {
    const sections: Section[] = [];
    let current: Section = { heading: null, body: "" };

    for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
        const match = line.match(SECTION_HEADING);
        if (match) {
            if (current.heading || current.body.trim()) sections.push(current);
            current = { heading: (match[1] || match[2]).trim(), body: "" };
        } else {
            current.body += line + "\n";
        }
    }
    if (current.heading || current.body.trim()) sections.push(current);
    return sections;
}

function Markdown({ children }: { children: string }) {
    return (
        <div className="prose-report">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        </div>
    );
}

function MarkdownReport({ text }: { text: string }) {
    const sections = useMemo(() => splitSections(text), [text]);
    const headed = sections.filter((s) => s.heading);

    // Only use cards when the output really is a list of titled sections
    if (headed.length < 2) {
        return <Markdown>{text}</Markdown>;
    }

    return (
        <div className="space-y-4">
            {sections.map((section, i) =>
                section.heading ? (
                    <article key={i} className="rounded-xl border border-border bg-background/60 p-5 sm:p-6">
                        <header className="flex items-start gap-3 mb-3">
                            <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <h4 className="text-base font-semibold leading-snug text-foreground">{section.heading}</h4>
                        </header>
                        {section.body.trim() && <Markdown>{section.body}</Markdown>}
                    </article>
                ) : (
                    section.body.trim() && <Markdown key={i}>{section.body}</Markdown>
                )
            )}
        </div>
    );
}

export default memo(MarkdownReport);

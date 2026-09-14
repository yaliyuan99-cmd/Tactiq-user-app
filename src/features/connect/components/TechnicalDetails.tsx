import { BATTERY_REFERENCE_NOTE, BLUETOOTH_REFERENCE, RING_LINE_FORMATS } from '../technicalReference';
import { Disclosure } from './Disclosure';

/** Identifiers and message formats for testers, all read from the protocol module. */
export function TechnicalDetails() {
  return (
    <Disclosure summary="Technical details">
      <div className="grid gap-5">
        <dl className="grid gap-3">
          {BLUETOOTH_REFERENCE.map((item) => (
            <div key={item.term}>
              <dt className="font-mono-label text-muted-foreground">{item.term}</dt>
              <dd className="min-w-0">
                <code className="break-all font-mono text-sm">{item.value}</code>
                {item.note && <span className="block text-sm text-muted-foreground">{item.note}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <h3 className="text-base">Lines the ring sends</h3>
          <p className="mt-1 text-sm text-muted-foreground">One line per message, ending in a newline.</p>
          <ul className="mt-3 grid gap-3">
            {RING_LINE_FORMATS.map((line) => (
              <li key={line.format}>
                <code className="break-all font-mono text-sm">{line.format}</code>
                <span className="block text-muted-foreground">{line.meaning}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base">Battery</h3>
          <p className="mt-1">{BATTERY_REFERENCE_NOTE}</p>
        </div>
      </div>
    </Disclosure>
  );
}

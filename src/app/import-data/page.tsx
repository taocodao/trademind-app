import { redirect } from 'next/navigation';

/** The import tool moved into the gated admin console. */
export default function ImportDataRedirect() {
    redirect('/admin');
}

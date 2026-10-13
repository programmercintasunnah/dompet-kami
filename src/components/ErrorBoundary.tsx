import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Penangkap error pada render, lifecycle, dan efek sehingga aplikasi
 * tidak menjadi layar kosong bila ada exception tak terduga.
 *
 * Catatan: error di dalam event handler async (mis. promise yang ditolak)
 * tidak bisa ditangkap oleh error boundary.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Aplikasi gagal merender:", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center pt-safe">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-2xl">
          !
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
          <p className="text-sm text-muted-foreground">
            Aplikasi tidak bisa menampilkan halaman ini. Coba lagi, atau muat
            ulang aplikasi.
          </p>
        </div>

        <p className="max-w-md break-words rounded-lg bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
          {error.message}
        </p>

        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button size="lg" onClick={this.reset}>
            Coba lagi
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Muat ulang halaman
          </Button>
        </div>
      </div>
    );
  }
}

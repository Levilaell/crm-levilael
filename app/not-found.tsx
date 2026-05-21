import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Não encontrado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Essa página não existe ou foi removida.
          </p>
          <Button render={<Link href="/">Voltar ao pipeline</Link>} />
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/auth-context';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('tecnico.demo@trazaDH.com');
  const [password, setPassword] = useState('trazaDH1010');
  const [rutaNumero, setRutaNumero] = useState('15');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ usuario, password, rutaNumero });
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible iniciar sesion.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='grid min-h-screen place-items-center bg-gradient-to-br from-wine-900 via-wine-800 to-wine-950 p-4'>
      <Card className='w-full max-w-md border-wine-300/20 bg-white/95 shadow-panel'>
        <CardHeader className='space-y-2 text-center'>
          <div className='mx-auto grid h-12 w-12 place-items-center rounded-xl bg-wine-100'>
            <ShieldCheck className='h-6 w-6 text-wine-800' />
          </div>
          <CardTitle>Acceso tecnico</CardTitle>
          <p className='text-sm text-slate-500'>
            Usuario: primernombre.primerapellido@trazaDH.com
            <br />
            Contraseña: trazaDH + ultimos 4 digitos de la cédula
          </p>
        </CardHeader>

        <CardContent>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <Input
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              placeholder='primernombre.primerapellido@trazaDH.com'
              required
            />
            <Input
              type='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder='Contraseña'
              required
            />
            <Input
              value={rutaNumero}
              onChange={(event) => setRutaNumero(event.target.value)}
              placeholder='Ruta (opcional)'
            />

            {error ? <p className='text-sm font-medium text-red-600'>{error}</p> : null}

            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Ingresar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

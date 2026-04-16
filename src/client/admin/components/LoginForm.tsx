interface Props {
  onLogin: (token: string) => void;
}

export default function LoginForm({ onLogin }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p>Login form placeholder</p>
    </div>
  );
}

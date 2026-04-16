interface Props {
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ token, onLogout }: Props) {
  return (
    <div className="h-screen flex items-center justify-center">
      <p>Dashboard placeholder</p>
    </div>
  );
}

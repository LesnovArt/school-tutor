type Props = { message: string };

export function LoadingScreen({ message }: Props): React.JSX.Element {
  return <main className="page"><p>{message}</p></main>;
}

export const metadata = {
  title: 'NYU 选课助手',
  description: 'NYU Shanghai Study Away 选课智能助手',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

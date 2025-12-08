import { Metadata } from 'next';
import { Title, Text, Container, Card } from '@mantine/core';

// Test Vanilla Extract import
import { container, card, textCenter, fadeInClass } from '@/styles/styles.css';

export const metadata: Metadata = {
  title: 'hobby.ninja - Static Database',
  description: 'Static HTML pages for hobby.ninja graph database',
};

export default function HomePage() {
  return (
    <div className={`${container} ${fadeInClass}`}>
      <Container size="lg">
        <div className={textCenter}>
          <Title order={1}>hobby.ninja</Title>
          <Text>Mantine + Vanilla Extract Setup</Text>
        </div>
        <Card className={card} p="lg" mt="md">
          <Text>✅ Mantine components working!</Text>
          <Text>✅ Vanilla Extract CSS working!</Text>
          <Text>✅ Static export working!</Text>
        </Card>
      </Container>
    </div>
  );
}
import React from "react";

type ChallengePanelProps = {
  title: string;
  description: string;
};

function ChallengePanel({ title, description }: ChallengePanelProps) {
  return (
    <section className="problem">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default ChallengePanel;

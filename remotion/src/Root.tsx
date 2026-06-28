import React from "react";
import {Composition} from "remotion";

import {CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS} from "./clean-knowledge-talk-props";
import {
  CleanKnowledgeTalk,
} from "./compositions/CleanKnowledgeTalk";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CleanKnowledgeTalk"
        component={CleanKnowledgeTalk}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS}
      />
    </>
  );
};

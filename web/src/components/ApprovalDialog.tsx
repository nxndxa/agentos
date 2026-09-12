import { ACME_DRAFT } from "../data/demo";
import { ShieldIcon } from "./Icons";
import { Modal } from "./Modal";
import { Button } from "./ui";

interface ApprovalDialogProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function ApprovalDialog({ onClose, onConfirm }: ApprovalDialogProps) {
  return (
    <Modal labelledBy="approval-title" describedBy="approval-sub" onClose={onClose}>
      <div className="dialog__head">
        <span className="dialog__icon dialog__icon--danger">
          <ShieldIcon size={20} />
        </span>
        <div>
          <h2 className="dialog__title" id="approval-title">
            Approve external action
          </h2>
          <p className="dialog__sub" id="approval-sub">
            <code>email.send</code> leaves the building. AgentOS blocks it until a human decides,
            then records the approval in the audit log.
          </p>
        </div>
      </div>

      <div className="dialog__body">
        <div className="field-block">
          <span className="field-block__label">To</span>
          <span className="field-block__value">{ACME_DRAFT.to}</span>
        </div>
        <div className="field-block">
          <span className="field-block__label">Subject</span>
          <span className="field-block__value">{ACME_DRAFT.subject}</span>
        </div>
        <div className="field-block">
          <span className="field-block__label">Body</span>
          <span className="field-block__value field-block__value--mono">{ACME_DRAFT.body}</span>
        </div>
      </div>

      <div className="dialog__actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Approve &amp; send
        </Button>
      </div>
    </Modal>
  );
}

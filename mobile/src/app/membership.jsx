import { Text, View } from "react-native";
import { useRead } from "../lib/session";
import {
  Button,
  ErrorNotice,
  Gate,
  Loading,
  Screen,
  s,
} from "../components/ui";
function Content() {
  const result = useRead("/memberships");
  return (
    <Screen title="Plans and membership">
      <ErrorNotice message={result.error} />
      {!result.data && !result.error ? (
        <Loading />
      ) : (
        result.data && (
          <>
            <Text style={s.text}>
              {result.data.active
                ? "Your membership is active."
                : "No active membership."}
            </Text>
            {result.data.expires_at && (
              <Text style={s.muted}>
                Expires: {new Date(result.data.expires_at).toLocaleDateString()}
              </Text>
            )}
            {result.data.plans.map((plan) => (
              <View style={s.card} key={plan.code}>
                <Text style={s.heading}>
                  {plan.role === "caregiver"
                    ? "Caregiver Premium"
                    : "Employer contact access"}
                </Text>
                <Text style={s.text}>
                  KES {plan.amount} for {plan.days} days
                </Text>
                <Text style={s.muted}>
                  {plan.role === "caregiver"
                    ? "Priority among profiles matching the employer’s filters. Identity review is separate."
                    : "Unlock new contacts. Previously unlocked contacts remain after ordinary pass expiry."}
                </Text>
                <Button
                  title="Payments coming soon"
                  disabled
                  onPress={() => {}}
                />
              </View>
            ))}
            <Text style={s.muted}>
              Checkout remains disabled. Early renewal will extend the existing
              expiry date.
            </Text>
          </>
        )
      )}
      {result.error && <Button title="Retry" onPress={result.reload} />}
    </Screen>
  );
}
export default function Membership() {
  return (
    <Gate>
      <Content />
    </Gate>
  );
}

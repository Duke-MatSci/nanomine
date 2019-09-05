function F1D = FFT2oneD(F2D)
[imax, jmax] = size(F2D);
R = min(floor(imax/2),floor(jmax/2)); 
count = zeros(round(R)+1,1);
Bn = zeros(round(R)+1,1);
c = F2D;
jc = floor(jmax/2)+1;
ic = floor(imax/2)+1;

for i = 1:imax
    for j = 1 : jmax
        r = ceil(sqrt((i-ic)^2 + (j-jc)^2)); % r is the distances between a given point and the max value point(peak).
        if r<=round(R)   % this constraints is to confine the counting range into a circle which has the radius of R, and centered at the peak
            Bn(r+1) = Bn(r+1) + c(i,j);  % add all the value of the pixels together, which are located on the same circle centered at the peak
            count(r+1) = count(r+1) +1;  % also count the number of the pixels located on the same circle. It should be monotone increasing.
        end
    end
end

Bn = Bn./count;
F1D = Bn;